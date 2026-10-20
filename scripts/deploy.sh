#!/usr/bin/env bash
# =============================================================================
# deploy.sh — ATS Master EC2 Deployment Script
# Called by GitHub Actions via AWS SSM Run Command.
#
# Required environment variables (injected by SSM):
#   IMAGE_TAG        - Git SHA used as Docker image tag
#   AWS_REGION       - e.g. ap-south-1
#   ECR_REGISTRY     - e.g. 123456789.dkr.ecr.ap-south-1.amazonaws.com
#   ECR_REPO_SERVER  - ECR repository name for server
#   ECR_REPO_CLIENT  - ECR repository name for client
#   ECR_REPO_PYTHON  - ECR repository name for python-ai-service
#   SECRET_NAME      - AWS Secrets Manager secret name
# =============================================================================

set -euo pipefail

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "🚀 Starting ATS Master deployment | Tag: ${IMAGE_TAG}"

# ─── 1. Authenticate Docker with ECR ────────────────────────────────────────
log "🔐 Logging into ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${ECR_REGISTRY}"

# ─── 2. Pull secrets from AWS Secrets Manager ───────────────────────────────
log "🔑 Fetching secrets from AWS Secrets Manager (${SECRET_NAME})..."
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_NAME}" \
  --region "${AWS_REGION}" \
  --query SecretString \
  --output text)

# Parse individual secret values using Python (available on Amazon Linux 2)
MONGODB_URI=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['MONGODB_URI'])")
JWT_SECRET=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['JWT_SECRET'])")
JWT_EXPIRE=$(echo "$SECRET_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('JWT_EXPIRE','7d'))")
GOOGLE_API_KEY=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['GOOGLE_API_KEY'])")
CLIENT_URL=$(echo "$SECRET_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('CLIENT_URL','http://localhost'))")
GITHUB_TOKEN=$(echo "$SECRET_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('GITHUB_TOKEN',''))")

log "✅ Secrets loaded"

# ─── 3. Pull latest images from ECR ─────────────────────────────────────────
log "📦 Pulling Docker images..."
docker pull "${ECR_REGISTRY}/${ECR_REPO_SERVER}:${IMAGE_TAG}"
docker pull "${ECR_REGISTRY}/${ECR_REPO_CLIENT}:${IMAGE_TAG}"
docker pull "${ECR_REGISTRY}/${ECR_REPO_PYTHON}:${IMAGE_TAG}"
log "✅ Images pulled"

# ─── 4. Write docker-compose.prod.yml ────────────────────────────────────────
log "📝 Writing production docker-compose file..."
cat > /home/ec2-user/docker-compose.prod.yml <<EOF
services:
  python-ai-service:
    image: ${ECR_REGISTRY}/${ECR_REPO_PYTHON}:${IMAGE_TAG}
    container_name: atsmaster-python-ai
    restart: unless-stopped
    environment:
      PORT: "5000"
      FLASK_ENV: production
      GOOGLE_API_KEY: "${GOOGLE_API_KEY}"
      GITHUB_TOKEN: "${GITHUB_TOKEN}"
    ports:
      - "5000:5000"
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
    environment:
      PORT: "3001"
      NODE_ENV: production
      MONGODB_URI: "${MONGODB_URI}"
      JWT_SECRET: "${JWT_SECRET}"
      JWT_EXPIRE: "${JWT_EXPIRE}"
      CLIENT_URL: "${CLIENT_URL}"
      AI_SERVICE_URL: "http://python-ai-service:5000"
      PYTHON_SERVICE_URL: "http://python-ai-service:5000"
    ports:
      - "3001:3001"
    depends_on:
      python-ai-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      start_period: 30s
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
      test: ["CMD", "wget", "-qO-", "http://localhost:80/health"]
      interval: 30s
      timeout: 5s
      start_period: 10s
      retries: 3
    networks:
      - atsmaster-net

networks:
  atsmaster-net:
    driver: bridge
EOF

# ─── 5. Rolling deploy (zero-downtime) ───────────────────────────────────────
COMPOSE_FILE="/home/ec2-user/docker-compose.prod.yml"

log "🔄 Deploying containers (rolling update)..."

# Pull is already done, bring up new containers
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

# Wait for services to be healthy
log "⏳ Waiting for services to become healthy..."
MAX_WAIT=120
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $MAX_WAIT ]; do
  HEALTHY=$(docker compose -f "${COMPOSE_FILE}" ps --format json 2>/dev/null | \
    python3 -c "
import sys, json
lines = sys.stdin.read().strip().split('\n')
total = len(lines)
healthy = sum(1 for l in lines if l and json.loads(l).get('Health','') in ('healthy',''))
print(healthy == total)
" 2>/dev/null || echo "False")

  if [ "$HEALTHY" = "True" ]; then
    log "✅ All services healthy!"
    break
  fi
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
  log "   Still waiting... ($ELAPSED/${MAX_WAIT}s)"
done

# ─── 6. Clean up old/dangling images ────────────────────────────────────────
log "🧹 Pruning dangling Docker images..."
docker image prune -f

# ─── 7. Status summary ───────────────────────────────────────────────────────
log "📊 Container status:"
docker compose -f "${COMPOSE_FILE}" ps

log "🎉 Deployment complete! Tag: ${IMAGE_TAG}"
