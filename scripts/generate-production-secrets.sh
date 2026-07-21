#!/usr/bin/env bash
# Generate JWT_SECRET_KEY for production.
# Usage: ./scripts/generate-production-secrets.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if command -v python >/dev/null 2>&1; then
  (cd apps/api && python -m scripts.generate_production_secrets)
else
  echo "JWT_SECRET_KEY=$(openssl rand -hex 32)"
fi

echo "# MOYSKLAD_WEBHOOK_SECRET=$(openssl rand -hex 24)"
