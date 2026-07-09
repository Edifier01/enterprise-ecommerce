#!/usr/bin/env bash
# Deploy enterprise-ecommerce on a single VPS with Docker Compose.
# Usage (on server): ./scripts/deploy.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy .env.production.example and fill in values."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DOMAIN:-}" || -z "${JWT_SECRET_KEY:-}" || -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "DOMAIN, JWT_SECRET_KEY, and POSTGRES_PASSWORD are required in $ENV_FILE"
  exit 1
fi

echo "==> Pulling latest code..."
git pull --ff-only origin master

echo "==> Building and starting containers..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build

echo "==> Waiting for API readiness..."
for _ in $(seq 1 30); do
  if docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" exec -T api \
    python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready')" \
    >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Deployment complete."
echo "Site: https://${DOMAIN}"
echo "API health: https://${DOMAIN}/health"
