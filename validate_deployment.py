"""
Validates all ATS Master deployment configuration files without running docker.
Run with: python validate_deployment.py
"""
import yaml
import json
import re
import sys
import os

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

errors = []
warnings = []
ok_messages = []


def check(condition, ok_msg, err_msg):
    if condition:
        ok_messages.append(f"  ✅ {ok_msg}")
    else:
        errors.append(f"  ❌ {err_msg}")


def warn(condition, ok_msg, warn_msg):
    if condition:
        ok_messages.append(f"  ✅ {ok_msg}")
    else:
        warnings.append(f"  ⚠️  {warn_msg}")


def read(rel_path):
    full = os.path.join(REPO_ROOT, rel_path)
    with open(full, "r", encoding="utf-8") as f:
        return f.read()


# ─── 1. Validate deploy.yml ──────────────────────────────────────────────────
print("\n=== deploy.yml ===")
wf_text = read(".github/workflows/deploy.yml")
try:
    wf = yaml.safe_load(wf_text)
    ok_messages.append("  ✅ YAML parses without errors")
except yaml.YAMLError as e:
    errors.append(f"  ❌ YAML parse error: {e}")
    wf = {}

branches = wf.get("on", {}).get("push", {}).get("branches", [])
check("master" in branches, "Trigger branch is 'master'", f"Trigger branch is {branches}, expected 'master'")
check("main" not in branches, "Trigger does not include 'main'", "Trigger still includes 'main'")

env = wf.get("env", {})
check(env.get("ECR_REPO_SERVER") == "ats-master-server", "ECR_REPO_SERVER = ats-master-server", f"ECR_REPO_SERVER = {env.get('ECR_REPO_SERVER')}")
check(env.get("ECR_REPO_CLIENT") == "ats-master-client", "ECR_REPO_CLIENT = ats-master-client", f"ECR_REPO_CLIENT = {env.get('ECR_REPO_CLIENT')}")
check(env.get("ECR_REPO_PYTHON") == "ats-master-python-ai", "ECR_REPO_PYTHON = ats-master-python-ai", f"ECR_REPO_PYTHON = {env.get('ECR_REPO_PYTHON')}")
check(env.get("APP_DIR") == "/opt/ats-master", "APP_DIR = /opt/ats-master", f"APP_DIR = {env.get('APP_DIR')}")
check(env.get("SECRET_NAME") == "atsmaster/production", "SECRET_NAME = atsmaster/production", f"SECRET_NAME = {env.get('SECRET_NAME')}")

check("s3://" not in wf_text, "No S3 references", "S3 reference found — S3 dependency must be removed")
check("DEPLOY_BUCKET" not in wf_text, "No DEPLOY_BUCKET reference", "DEPLOY_BUCKET reference found")
check("ec2-user" not in wf_text, "No ec2-user path reference", "ec2-user path reference found (wrong for Ubuntu)")

jobs = wf.get("jobs", {})
build_job = jobs.get("build-and-push", {})
deploy_job = jobs.get("deploy", {})
check(build_job.get("permissions", {}).get("id-token") == "write", "build-and-push has id-token: write", "build-and-push missing id-token: write (OIDC will fail)")
check(deploy_job.get("permissions", {}).get("id-token") == "write", "deploy has id-token: write", "deploy job missing id-token: write")
check(deploy_job.get("environment") == "production", "deploy job uses 'production' environment", "deploy job missing environment: production")
check("vars.AWS_ACCOUNT_ID" in wf_text, "Uses vars.AWS_ACCOUNT_ID (not secrets.*)", "AWS_ACCOUNT_ID still uses secrets.* instead of vars.*")
check("vars.EC2_INSTANCE_ID" in wf_text, "Uses vars.EC2_INSTANCE_ID", "EC2_INSTANCE_ID uses secrets.* instead of vars.*")
check("atsmaster-server" not in wf_text, "Old ECR name 'atsmaster-server' not present", "Old ECR name 'atsmaster-server' still present")
check("082287604856" in wf_text, "Real AWS account ID present", "Placeholder ACCOUNT_ID still present")

for msg in ok_messages:
    print(msg)
ok_messages.clear()


# ─── 2. Validate deploy.sh ───────────────────────────────────────────────────
print("\n=== scripts/deploy.sh ===")
sh_text = read("scripts/deploy.sh")

check("/opt/ats-master" in sh_text, "Uses /opt/ats-master directory", "Wrong deploy directory")
check("ec2-user" not in sh_text, "No ec2-user path", "ec2-user path found (wrong for Ubuntu)")
check("s3://" not in sh_text, "No S3 dependency", "S3 reference found in deploy.sh")
check(".env.production" in sh_text, "Writes .env.production env file", ".env.production not found")
check("mode 600" in sh_text or "chmod" in sh_text, "Sets file permissions on env file", "No chmod for env file")
check("rm -f" in sh_text, "Wipes temp secret file after use", "Temp secret file not cleaned up")
check("docker compose" in sh_text, "Uses 'docker compose' (v2)", "Uses old 'docker-compose' command")
check("env_file" in sh_text, "Uses env_file to pass secrets", "Secrets hardcoded inline in YAML")
check("expose:" in sh_text, "Backend ports use expose: (not published)", "Missing expose: directive")
check('"ports:' not in sh_text.replace("- '80:80'", "").replace('- "80:80"', "").replace("80:80", "CHECKED"), 
      "Only port 80 is published",
      "Backend port may be published to host")
check("3001:3001" not in sh_text, "Port 3001 NOT published to host", "Port 3001 is published to host")
check("5000:5000" not in sh_text, "Port 5000 NOT published to host", "Port 5000 is published to host")
check("python3" in sh_text, "Uses python3 for secret parsing", "python3 not found in deploy.sh")
check("set -euo pipefail" in sh_text, "Has strict error handling (set -euo pipefail)", "Missing strict error handling")

# Check for the broken first heredoc (duplicate dead code from before)
first_pyeof_pos = sh_text.find("PYEOF")
# There should be exactly 2 PYEOF markers (open+close for the one Python block)
pyeof_count = sh_text.count("PYEOF")
check(pyeof_count == 2, f"Exactly 2 PYEOF markers (1 Python block) - found {pyeof_count}", 
      f"Wrong number of PYEOF markers: {pyeof_count} (expected 2, extra = dead code)")

for msg in ok_messages:
    print(msg)
ok_messages.clear()


# ─── 3. Validate Dockerfiles ─────────────────────────────────────────────────
print("\n=== server/Dockerfile ===")
srv_df = read("server/Dockerfile")
check("FROM node:20-alpine" in srv_df, "Uses node:20-alpine", "Wrong base image")
check("wget" not in srv_df, "No wget in server health check (not available in alpine)", "wget used in healthcheck — not available in node:20-alpine")
check("node -e" in srv_df, "Uses 'node -e' for health check", "Missing 'node -e' healthcheck")
check("start-period=60s" in srv_df, "start_period=60s (server loads ML models on start)", "start_period too short for server startup")
check("adduser" in srv_df or "useradd" in srv_df, "Creates non-root user", "No non-root user")
check("npm ci --omit=dev" in srv_df, "Installs production deps only", "Dev dependencies may be installed")
for msg in ok_messages:
    print(msg)
ok_messages.clear()

print("\n=== client/Dockerfile ===")
cli_df = read("client/Dockerfile")
check("FROM node:20-alpine" in cli_df, "Build stage uses node:20-alpine", "Wrong build image")
check("FROM nginx:1.27-alpine" in cli_df, "Serve stage uses nginx:1.27-alpine", "Wrong serve image")
check("nginx.conf" in cli_df, "Copies nginx.conf", "nginx.conf not copied")
check("npm run build" in cli_df, "Runs Vite build", "Missing npm run build")
check("localhost:80" not in cli_df, "Health check does not specify port 80 redundantly", "localhost:80 in health check")
check("/app/dist" in cli_df, "Copies /app/dist (Vite output)", "Wrong static files path")
for msg in ok_messages:
    print(msg)
ok_messages.clear()

print("\n=== python-ai-service/Dockerfile ===")
py_df = read("python-ai-service/Dockerfile")
check("FROM python:3.11-slim" in py_df, "Uses python:3.11-slim", "Wrong base image")
check("gunicorn" in py_df, "Uses gunicorn (production WSGI)", "gunicorn not used")
check("PYTHONDONTWRITEBYTECODE" in py_df, "Sets PYTHONDONTWRITEBYTECODE", "Missing PYTHONDONTWRITEBYTECODE")
check("appuser" in py_df or "useradd" in py_df, "Creates non-root user", "No non-root user")
check("start-period=60s" in py_df, "start_period=60s (heavy deps take time)", "start_period too short")
check("--prefix=/install" in py_df, "Installs deps to /install prefix (multi-stage)", "Missing multi-stage pip install")
for msg in ok_messages:
    print(msg)
ok_messages.clear()


# ─── 4. Validate nginx.conf ──────────────────────────────────────────────────
print("\n=== client/nginx.conf ===")
nginx = read("client/nginx.conf")
check("location /health" in nginx, "Has /health endpoint", "Missing /health endpoint")
check("location /api/" in nginx, "Proxies /api/", "Missing /api/ proxy")
check("location /python-api/" in nginx, "Proxies /python-api/", "Missing /python-api/ proxy")
check("proxy_pass http://server:3001" in nginx, "Proxies to http://server:3001 (Docker service name)", "Wrong upstream for API")
check("proxy_pass http://python-ai-service:5000" in nginx, "Proxies to http://python-ai-service:5000", "Wrong upstream for Python service")
check("try_files" in nginx, "SPA fallback with try_files", "Missing SPA fallback")
check("rewrite ^/python-api/" in nginx, "Strips /python-api prefix before forwarding", "Missing rewrite rule for python-api")
check("localhost" not in nginx.replace("localhost/health", "CHECKED"), "No hardcoded localhost upstream", "Hardcoded localhost as upstream (wrong in Docker)")
check("proxy_read_timeout 300s" in nginx, "Long timeout for AI requests (300s)", "AI proxy timeout may be too short")
check("Upgrade" not in nginx and "Connection 'upgrade'" not in nginx, "No unnecessary WebSocket headers", "WebSocket headers present for REST API")
for msg in ok_messages:
    print(msg)
ok_messages.clear()


# ─── 5. Validate IAM files ───────────────────────────────────────────────────
print("\n=== iam/github-actions-trust-policy.json ===")
trust = json.loads(read("iam/github-actions-trust-policy.json"))
stmt = trust["Statement"][0]
check("082287604856" in stmt["Principal"]["Federated"], "Real account ID in trust policy", "Placeholder account ID")
check("shivraj2805/ATS-Master" in stmt["Condition"]["StringEquals"].get("token.actions.githubusercontent.com:sub", ""), "Correct repo in trust policy", "Wrong repo in trust policy")
check("refs/heads/master" in stmt["Condition"]["StringEquals"].get("token.actions.githubusercontent.com:sub", ""), "Scoped to master branch", "Wrong branch in trust policy")
check("StringEquals" in str(stmt["Condition"]), "Uses StringEquals (strict)", "StringLike used — less strict than StringEquals")
for msg in ok_messages:
    print(msg)
ok_messages.clear()

print("\n=== iam/github-actions-policy.json ===")
gha_policy = json.loads(read("iam/github-actions-policy.json"))
all_resources = str(gha_policy)
check("082287604856" in all_resources, "Real account ID in policy", "Placeholder account ID")
check("ats-master-server" in all_resources, "ats-master-server ECR name", "Old or wrong ECR name")
check("ats-master-client" in all_resources, "ats-master-client ECR name", "Old or wrong ECR name")
check("ats-master-python-ai" in all_resources, "ats-master-python-ai ECR name", "Old or wrong ECR name")
check("i-0df169a173cba0eb7" in all_resources, "Real EC2 instance ID in SSM policy", "Placeholder instance ID")
check("s3:" not in all_resources, "No S3 permissions", "S3 permissions still present")
check("atsmaster-server" not in all_resources, "Old ECR name 'atsmaster-server' not present", "Old ECR name still present")
for msg in ok_messages:
    print(msg)
ok_messages.clear()

print("\n=== iam/ec2-instance-policy.json ===")
ec2_policy = json.loads(read("iam/ec2-instance-policy.json"))
all_ec2 = str(ec2_policy)
check("082287604856" in all_ec2, "Real account ID", "Placeholder account ID")
check("ats-master-server" in all_ec2, "ats-master-server ECR name", "Old or wrong ECR name")
check("secretsmanager:GetSecretValue" in all_ec2, "Secrets Manager read permission", "Missing Secrets Manager permission")
check("atsmaster/production" in all_ec2, "Scoped to atsmaster/production secret", "Secrets Manager not scoped correctly")
check("s3:" not in all_ec2, "No S3 permissions in EC2 role", "S3 permissions present in EC2 role")
for msg in ok_messages:
    print(msg)
ok_messages.clear()


# ─── Summary ─────────────────────────────────────────────────────────────────
print("\n" + "="*60)
if errors:
    print(f"RESULT: {len(errors)} ERROR(S) FOUND")
    for e in errors:
        print(e)
else:
    print("RESULT: ALL CHECKS PASSED ✅")

if warnings:
    print(f"\n{len(warnings)} WARNING(S):")
    for w in warnings:
        print(w)
