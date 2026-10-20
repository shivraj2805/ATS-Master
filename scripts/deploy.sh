bash
#!/usr/bin/env bash
# =============================================================================
# deploy.sh — ATS Master EC2 Deployment Script
# Executed on EC2 by GitHub Actions via AWS SSM Run Command.
#
# Environment variables injected by deploy.yml:
#   IMAGE_TAG       — Git SHA
#   AWS_REGION      — e.g. ap-south-1
#   ECR_REGISTRY    — AWS ECR registry URL
#   ECR_REPO_SERVER — ats-master-server
#   ECR_REPO_CLIENT — ats-master-client
#   ECR_REPO_PYTHON — ats-master-python-ai
#   SECRET_NAME     — atsmaster/production
#   APP_DIR         — /opt/ats-master
# =============================================================================

set -euo pipefail

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Validate required deployment variables
: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${AWS_REGION:?AWS_REGION is required}"
: "${ECR_REGISTRY:?ECR_REGISTRY is required}"
: "${ECR_REPO_SERVER:?ECR_REPO_SERVER is required}"
: "${ECR_REPO_CLIENT:?ECR_REPO_CLIENT is required}"
: "${ECR_REPO_PYTHON:?ECR_REPO_PYTHON is required}"
: "${SECRET_NAME:?SECRET_NAME is required}"

APP_DIR="${APP_DIR:-/opt/ats-master}"
ENV_FILE="${APP_DIR}/.env.production"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
TMP_SECRET="/tmp/.ats_secret_$$.json"

# 1. Prepare application directory
log "Preparing application directory: ${APP_DIR}"
mkdir -p "${APP_DIR}"

# 2. Authenticate Docker with ECR using the EC2 instance role
log "Logging into Amazon ECR..."
aws ecr get-login-password --region "${AWS_REGION}" |
    docker login --username AWS --password-stdin "${ECR_REGISTRY}"

# 3. Fetch secrets and write them to a protected env file
log "Fetching secrets from AWS Secrets Manager..."

cleanup() {
    rm -f "${TMP_SECRET}"
}
trap cleanup EXIT

aws secretsmanager get-secret-value \
    --secret-id "${SECRET_NAME}" \
    --region "${AWS_REGION}" \
    --query SecretString \
    --output text > "${TMP_SECRET}"

chmod 600 "${TMP_SECRET}"

ENV_FILE="${ENV_FILE}" TMP_SECRET="${TMP_SECRET}" python3 - <<'PYEOF'
import json
import os
import sys

tmp = os.environ["TMP_SECRET"]
env_file = os.environ["ENV_FILE"]

with open(tmp, "r") as f:
    data = json.load(f)

required_keys = ["MONGODB_URI", "JWT_SECRET", "GOOGLE_API_KEY"]
optional_keys = ["JWT_EXPIRE", "CLIENT_URL", "GITHUB_TOKEN"]

missing = [key for key in required_keys if not data.get(key)]
if missing:
    print(
        f"ERROR: Required secret keys are missing or empty: {missing}",
        file=sys.stderr,
    )
    sys.exit(1)

lines = []
for key in required_keys + optional_keys:
    value = data.get(key, "")
    if value:
        if "\n" in str(value) or "\r" in str(value):
            print(f"ERROR: Invalid newline in {key}", file=sys.stderr)
            sys.exit(1)
        lines.append(f"{key}={value}")

with open(env_file, "w") as f:
    f.write("\n".join(lines) + "\n")

os.chmod(env_file, 0o600)
print(f"Secrets written to {env_file} (mode 600, {len(lines)} keys)")
PYEOF

rm -f "${TMP_SECRET}"
trap - EXIT
log "Secrets loaded into protected environment file."

# 4. Pull the three images from ECR
log "Pulling Docker images (tag: ${IMAGE_TAG})..."
docker pull "${ECR_REGISTRY}/${ECR_REPO_PYTHON}:${IMAGE_TAG}"
docker pull "${ECR_REGISTRY}/${ECR_REPO_SERVER}:${IMAGE_TAG}"
docker pull "${ECR_REGISTRY}/${ECR_REPO_CLIENT}:${IMAGE_TAG}"
log "All images pulled."

# 5. Generate production Docker Compose configuration
# Secrets are provided through env_file, not embedded in YAML.
# Only port 80 is published; backend services remain internal.
log "Writing ${COMPOSE_FILE}..."

cat > "${COMPOSE_FILE}" <<COMPOSE
services:
  python-ai-service:
    image: ${ECR_REGISTRY}/${ECR_REPO_PYTHON}:${IMAGE_TAG}
    container_name: atsmaster-python-ai
    restart: unless-stopped
    env_file:
      - ${ENV_FILE}
    environment:
      PORT: "5000"
      FLASK_ENV: production
    expose:
      - "5000"
    healthcheck:
      test: ["CMD", "python3", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"]
      interval: 30s
      timeout: 15s
      start_period: 60s
      retries: 3
    networks:
      - atsmaster-net

  server:
    image: ${ECR_REGISTRY}/${ECR_REPO_SERVER}:${IMAGE_TAG}
    container_name: atsmaster-server
    restart: unless-stopped
    env_file:
      - ${ENV_FILE}
    environment:
      PORT: "3001"
      NODE_ENV: production
      AI_SERVICE_URL: "http://python-ai-service:5000"
      PYTHON_SERVICE_URL: "http://python-ai-service:5000"
    expose:
      - "3001"
    depends_on:
      python-ai-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 10s
      start_period: 60s
      retries: 3
    networks:
      - atsmaster-net

  client:
    image: ${ECR_REGISTRY}/${ECR_REPO_CLIENT}:${IMAGE_TAG}
    container_name: atsmaster-client
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      server:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1/"]
      interval: 30s
      timeout: 5s
      start_period: 30s
      retries: 3
    networks:
      - atsmaster-net

networks:
  atsmaster-net:
    driver: bridge
COMPOSE

chmod 600 "${COMPOSE_FILE}"
log "Production Compose configuration written."

# 6. Start or update containers
log "Starting/updating containers..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
log "Containers started."

# 7. Wait for all three services to become healthy
log "Waiting for all 3 services to become healthy (up to 3 minutes)..."

MAX_WAIT=180
ELAPSED=0
INTERVAL=15
ALL_HEALTHY=false

while [ "${ELAPSED}" -lt "${MAX_WAIT}" ]; do
    sleep "${INTERVAL}"
    ELAPSED=$((ELAPSED + INTERVAL))

    HEALTHY="$(
        docker compose -f "${COMPOSE_FILE}" ps --format json |
        python3 -c '
import json, sys
healthy = 0
for line in sys.stdin:
    try:
        service = json.loads(line)
        if service.get("Health") == "healthy":
            healthy += 1
    except json.JSONDecodeError:
        pass
print(healthy)
'
    )"

    log "Healthy services: ${HEALTHY}/3 (${ELAPSED}s elapsed)"

    if [ "${HEALTHY}" -eq 3 ]; then
        ALL_HEALTHY=true
        log "All 3 services are healthy."
        break
    fi
done

if [ "${ALL_HEALTHY}" = "false" ]; then
    log "WARNING: Not all services became healthy within ${MAX_WAIT}s."
    log "Recent server logs:"
    docker logs atsmaster-server --tail 50 || true
    log "Recent Python AI logs:"
    docker logs atsmaster-python-ai --tail 50 || true
    log "Recent client logs:"
    docker logs atsmaster-client --tail 50 || true
    docker compose -f "${COMPOSE_FILE}" ps
    exit 1
fi

# 8. Remove dangling images
log "Removing dangling images..."
docker image prune -f

# 9. Final status
log "Final container status:"
docker compose -f "${COMPOSE_FILE}" ps

log "Deployment completed successfully. Tag: ${IMAGE_TAG}"
log "Application is accessible on port 80."
