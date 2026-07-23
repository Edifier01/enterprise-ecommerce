#!/usr/bin/env bash
# Deploy enterprise-ecommerce on a single VPS with Docker Compose.
# Usage (on server): ./scripts/deploy.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-enterprise-ecommerce}"

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

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

log() {
  echo "[$(date -u +%H:%M:%S)] $*"
}

if [[ -z "${MEDIA_PUBLIC_BASE_URL:-}" ]]; then
  export MEDIA_PUBLIC_BASE_URL="https://${DOMAIN}/media"
  log "MEDIA_PUBLIC_BASE_URL not set; defaulting to https://${DOMAIN}/media"
fi

log "Syncing to origin/master..."
git fetch origin master
git reset --hard origin/master

log "Building images (BuildKit + layer cache)..."
GIT_COMMIT="$(git rev-parse HEAD)"
export GIT_COMMIT
BUILD_ARGS=(--progress=plain --parallel --build-arg "GIT_COMMIT=${GIT_COMMIT}")
if [[ "${NO_CACHE:-}" == "1" ]]; then
  log "NO_CACHE=1 — rebuilding api without layer cache"
  BUILD_ARGS+=(--no-cache api)
  "${COMPOSE[@]}" build "${BUILD_ARGS[@]}" web
else
  "${COMPOSE[@]}" build "${BUILD_ARGS[@]}"
fi

log "Tagging images for next deploy cache..."
docker image inspect "${PROJECT_NAME}-api:latest" >/dev/null 2>&1 \
  && docker tag "${PROJECT_NAME}-api:latest" "${PROJECT_NAME}-api:previous" || true
docker tag "${PROJECT_NAME}-api" "${PROJECT_NAME}-api:latest" 2>/dev/null || true

docker image inspect "${PROJECT_NAME}-web:latest" >/dev/null 2>&1 \
  && docker tag "${PROJECT_NAME}-web:latest" "${PROJECT_NAME}-web:previous" || true
docker tag "${PROJECT_NAME}-web" "${PROJECT_NAME}-web:latest" 2>/dev/null || true

log "Starting containers..."
"${COMPOSE[@]}" up -d

log "Waiting for API readiness (migrations may take a few minutes)..."
ready=0
for attempt in $(seq 1 90); do
  if "${COMPOSE[@]}" exec -T api \
    python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready')" \
    >/dev/null 2>&1; then
    ready=1
    break
  fi
  if (( attempt % 15 == 0 )); then
    log "Still waiting for API... (${attempt}/90)"
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  echo "ERROR: API did not become ready. Recent logs:"
  "${COMPOSE[@]}" ps
  "${COMPOSE[@]}" logs --tail=80 api || true
  exit 1
fi

log "Container status:"
"${COMPOSE[@]}" ps

log "Deployment complete."
echo "Site: https://${DOMAIN}"
echo "API health: https://${DOMAIN}/health"
