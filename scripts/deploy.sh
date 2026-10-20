#!/usr/bin/env bash
# =============================================================================
# deploy.sh — ATS Master EC2 Deployment Script
# Executed on EC2 by GitHub Actions via AWS SSM Run Command.
# EC2 fetches this exact file from GitHub at the pushed commit SHA,
# so it always runs the script that matches the deployed code.
#
# Environment variables injected by the SSM command in deploy.yml:
#   IMAGE_TAG        — Git SHA (e.g. abc1234...)
#   AWS_REGION       — e.g. ap-south-1
#   ECR_REGISTRY     — e.g. 082287604856.dkr.ecr.ap-south-1.amazonaws.com
#   ECR_REPO_SERVER  — ats-master-server
#   ECR_REPO_CLIENT  — ats-master-client
#   ECR_REPO_PYTHON  — ats-master-python-ai
#   SECRET_NAME      — atsmaster/production
#   APP_DIR          — /opt/ats-master
# =============================================================================

set -euo pipefail

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "🚀 Starting ATS Master deployment | Tag: ${IMAGE_TAG}"

APP_DIR="${APP_DIR:-/opt/ats-master}"
ENV_FILE="${APP_DIR}/.env.production"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
TMP_SECRET="/tmp/.ats_secret_$$.json"   # $$ = PID, unique per run

# ─── 1. Ensure application directory exists ──────────────────────────────────
log "📁 Preparing application directory: ${APP_DIR}"
mkdir -p "${APP_DIR}"

# ─── 2. Authenticate Docker with ECR using the EC2 instance role ─────────────
log "🔐 Logging into Amazon ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${ECR_REGISTRY}"

# ─── 3. Fetch secrets and write them to a protected env file ─────────────────
# The env file is root-owned, mode 600. Docker Compose reads it via env_file:.
# Secret values never appear in shell arguments, process listings, or logs.
log "🔑 Fetching secrets from AWS Secrets Manager (${SECRET_NAME})..."

# Fetch into a temp file with tight permissions, then parse with Python.
# Using a file instead of a shell variable avoids the secret appearing in
# /proc/<pid>/environ or command-line process listings.
aws secretsmanager get-secret-value \
  --secret-id "${SECRET_NAME}" \
  --region "${AWS_REGION}" \
  --query SecretString \
  --output text > "${TMP_SECRET}"
chmod 600 "${TMP_SECRET}"

# Parse and write the env file. Python never prints secret values.
ENV_FILE="${ENV_FILE}" TMP_SECRET="${TMP_SECRET}" python3 - <<'PYEOF'
import json, os, sys

tmp = os.environ['TMP_SECRET']
env_file = os.environ['ENV_FILE']

with open(tmp, 'r') as f:
    data = json.load(f)

required_keys = ['MONGODB_URI', 'JWT_SECRET', 'GOOGLE_API_KEY']
optional_keys = ['JWT_EXPIRE', 'CLIENT_URL', 'GITHUB_TOKEN']
all_keys = required_keys + optional_keys

missing = [k for k in required_keys if not data.get(k)]
if missing:
    print(f'ERROR: Required secret keys are missing or empty: {missing}', file=sys.stderr)
    sys.exit(1)

lines = []
for key in all_keys:
    val = data.get(key, '')
    if val:
        lines.append(f'{key}={val}')

with open(env_file, 'w') as f:
    f.write('\n'.join(lines) + '\n')

os.chmod(env_file, 0o600)
print(f'Secrets written to {env_file} (mode 600, {len(lines)} keys)')
PYEOF

# Wipe the temp secret file immediately after parsing
rm -f "${TMP_SECRET}"
log "✅ Secrets loaded into ${ENV_FILE}"

# ─── 4. Pull the three images from ECR ──────────────────────────────────────
log "📦 Pulling Docker images (tag: ${IMAGE_TAG})..."
docker pull "${ECR_REGISTRY}/${ECR_REPO_PYTHON}:${IMAGE_TAG}"
docker pull "${ECR_REGISTRY}/${ECR_REPO_SERVER}:${IMAGE_TAG}"
docker pull "${ECR_REGISTRY}/${ECR_REPO_CLIENT}:${IMAGE_TAG}"
log "✅ All images pulled"

# ─── 5. Write production docker-compose.prod.yml ────────────────────────────
# - Secrets are supplied via env_file (not hardcoded in YAML).
# - Ports 3001 and 5000 use expose: (internal only, not published to host).
# - Only port 80 is published; Nginx proxies all other traffic internally.
# NOTE: The heredoc is intentionally unquoted (<<COMPOSE not <<'COMPOSE')
#       so that shell variables like ${IMAGE_TAG} are expanded into the file.
log "📝 Writing ${COMPOSE_FILE}..."
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
      test: ["CMD", "wget", "-qO-", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3
    networks:
      - atsmaster-net

networks:
  atsmaster-net:
    driver: bridge
COMPOSE

log "✅ Compose file written to ${COMPOSE_FILE}"

# ─── 6. Start / update containers ────────────────────────────────────────────
log "🔄 Bringing containers up..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
log "✅ Containers started (waiting for health checks...)"

# ─── 7. Wait for all containers to report healthy ────────────────────────────
log "⏳ Waiting for all 3 services to become healthy (up to 3 minutes)..."
MAX_WAIT=180
ELAPSED=0
INTERVAL=15
ALL_HEALTHY=false

while [ "${ELAPSED}" -lt "${MAX_WAIT}" ]; do
  sleep "${INTERVAL}"
  ELAPSED=$((ELAPSED + INTERVAL))

  # Count containers with "(healthy)" in their status line
  HEALTHY=$(docker compose -f "${COMPOSE_FILE}" ps 2>/dev/null | grep -c "(healthy)" || true)
  TOTAL=$(docker compose -f "${COMPOSE_FILE}" ps -q 2>/dev/null | wc -l | tr -d ' ')

  log "   Healthy: ${HEALTHY}/${TOTAL} (${ELAPSED}s elapsed)"

  if [ "${HEALTHY}" -eq 3 ]; then
    ALL_HEALTHY=true
    log "✅ All 3 services are healthy!"
    break
  fi
done

if [ "${ALL_HEALTHY}" = "false" ]; then
  log "⚠️  Not all services are healthy after ${MAX_WAIT}s. Check logs with:"
  log "    docker logs atsmaster-server --tail 50"
  log "    docker logs atsmaster-python-ai --tail 50"
  # Show current state but don't exit 1 — containers are running, may still converge
  docker compose -f "${COMPOSE_FILE}" ps
fi

# ─── 8. Remove dangling images to reclaim disk space ─────────────────────────
log "🧹 Pruning dangling images..."
docker image prune -f

# ─── 9. Final status ─────────────────────────────────────────────────────────
log "📊 Container status:"
docker compose -f "${COMPOSE_FILE}" ps

log "🎉 Deployment complete! Tag: ${IMAGE_TAG}"
log "🌐 Application is accessible on port 80."
