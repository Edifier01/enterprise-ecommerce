#!/usr/bin/env bash
# Deploy enterprise-ecommerce on a single VPS with Docker Compose.
# Usage (on server): ./scripts/deploy.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")

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

echo "==> Building images..."
"${COMPOSE[@]}" build

echo "==> Starting containers..."
"${COMPOSE[@]}" up -d

echo "==> Waiting for API readiness..."
ready=0
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T api \
    python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready')" \
    >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  echo "ERROR: API did not become ready. Recent logs:"
  "${COMPOSE[@]}" ps
  "${COMPOSE[@]}" logs --tail=80 api || true
  exit 1
fi

echo "==> Container status:"
"${COMPOSE[@]}" ps

echo "==> Deployment complete."
echo "Site: https://${DOMAIN}"
echo "API health: https://${DOMAIN}/health"
