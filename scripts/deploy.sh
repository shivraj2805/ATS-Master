
#!/usr/bin/env bash
# =============================================================================
# deploy.sh — ATS Master EC2 Deployment Script
# Executed on EC2 by GitHub Actions via AWS SSM Run Command.
#
# Required environment variables:
#   IMAGE_TAG, AWS_REGION, ECR_REGISTRY
#   ECR_REPO_SERVER, ECR_REPO_CLIENT, ECR_REPO_PYTHON
#   SECRET_NAME
#
# Optional:
#   APP_DIR (defaults to /opt/ats-master)
# =============================================================================

set -euo pipefail

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# 1. Validate required variables
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
TMP_SECRET="$(mktemp /tmp/ats-secret.XXXXXX)"

cleanup() {
    rm -f "${TMP_SECRET}"
}
trap cleanup EXIT

# 2. Prepare application directory
log "Preparing application directory: ${APP_DIR}"
mkdir -p "${APP_DIR}"

# 3. Authenticate Docker with ECR
log "Logging into Amazon ECR..."
aws ecr get-login-password --region "${AWS_REGION}" |
    docker login --username AWS --password-stdin "${ECR_REGISTRY}"

# 4. Fetch production secrets
log "Fetching secrets from AWS Secrets Manager..."

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

with open(tmp, "r", encoding="utf-8") as f:
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
        value = str(value)
        if "\n" in value or "\r" in value:
            print(f"ERROR: Invalid newline in {key}", file=sys.stderr)
            sys.exit(1)
        lines.append(f"{key}={value}")

with open(env_file, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")

os.chmod(env_file, 0o600)
print(f"Secrets written to {env_file} (mode 600, {len(lines)} keys)")
PYEOF

rm -f "${TMP_SECRET}"
trap - EXIT
log "Secrets loaded into protected environment file."

# 5. Pull all deployment images
log "Pulling Docker images (tag: ${IMAGE_TAG})..."
docker pull "${ECR_REGISTRY}/${ECR_REPO_PYTHON}:${IMAGE_TAG}"
docker pull "${ECR_REGISTRY}/${ECR_REPO_SERVER}:${IMAGE_TAG}"
docker pull "${ECR_REGISTRY}/${ECR_REPO_CLIENT}:${IMAGE_TAG}"
log "All images pulled."

# 6. Generate production Compose configuration
# Secret values are provided via env_file, never embedded in YAML.
# Only the frontend port is published to the host.
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
      # Nginx serves the frontend at /; /health is not the frontend route.
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

# 7. Start or update containers
log "Starting/updating containers..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
log "Containers started."

# 8. Wait for all three services to become healthy
log "Waiting for all 3 services to become healthy (up to 3 minutes)..."

MAX_WAIT=180
ELAPSED=0
INTERVAL=15
ALL_HEALTHY=false

while [ "${ELAPSED}" -lt "${MAX_WAIT}" ]; do
    sleep "${INTERVAL}"
    ELAPSED=$((ELAPSED + INTERVAL))

    # Compose versions may emit either a JSON array or one JSON object per line.
    HEALTHY="$(
        docker compose -f "${COMPOSE_FILE}" ps --format json |
        python3 -c '
import json
import sys

raw = sys.stdin.read().strip()
if not raw:
    print(0)
    raise SystemExit(0)

try:
    parsed = json.loads(raw)
    services = parsed if isinstance(parsed, list) else [parsed]
except json.JSONDecodeError:
    services = []
    for line in raw.splitlines():
        try:
            item = json.loads(line)
            if isinstance(item, list):
                services.extend(item)
            else:
                services.append(item)
        except json.JSONDecodeError:
            pass

healthy = sum(
    1 for service in services
    if isinstance(service, dict)
    and str(service.get("Health", "")).lower() == "healthy"
)
print(healthy)
'
    )"

    log "Healthy services: ${HEALTHY}/3 (${ELAPSED}s elapsed)"

    if [ "${HEALTHY}" -eq 3 ]; then
        ALL_HEALTHY=true
        log "All 3 services are healthy."
        break
    fi

    # Stop early if a container has exited instead of waiting the full period.
    if docker compose -f "${COMPOSE_FILE}" ps --all --format json |
        python3 -c '
import json
import sys

raw = sys.stdin.read().strip()
try:
    parsed = json.loads(raw)
    services = parsed if isinstance(parsed, list) else [parsed]
except json.JSONDecodeError:
    services = []
    for line in raw.splitlines():
        try:
            item = json.loads(line)
            services.extend(item if isinstance(item, list) else [item])
        except json.JSONDecodeError:
            pass

bad = [
    s for s in services
    if isinstance(s, dict)
    and str(s.get("State", "")).lower() in ("exited", "dead")
]
sys.exit(0 if bad else 1)
'; then
        log "ERROR: One or more containers exited."
        break
    fi
done

if [ "${ALL_HEALTHY}" != "true" ]; then
    log "ERROR: Not all services became healthy."
    log "Recent server logs:"
    docker logs atsmaster-server --tail 50 || true
    log "Recent Python AI logs:"
    docker logs atsmaster-python-ai --tail 50 || true
    log "Recent client logs:"
    docker logs atsmaster-client --tail 50 || true
    log "Container status:"
    docker compose -f "${COMPOSE_FILE}" ps --all
    exit 1
fi

# 9. Remove dangling images
log "Removing dangling images..."
docker image prune -f

# 10. Final status
log "Final container status:"
docker compose -f "${COMPOSE_FILE}" ps

log "Deployment completed successfully. Tag: ${IMAGE_TAG}"
log "Application is accessible on port 80."
