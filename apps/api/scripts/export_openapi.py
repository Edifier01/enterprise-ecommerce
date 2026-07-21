"""Export OpenAPI 3.1 spec from the FastAPI app to repo-root openapi.yaml."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.main import app

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_PATH = REPO_ROOT / "openapi.yaml"


def _normalize_security(spec: dict) -> None:
    schemes = spec.get("components", {}).get("securitySchemes", {})
    if "HTTPBearer" in schemes:
        bearer = schemes.pop("HTTPBearer")
        bearer["bearerFormat"] = "JWT"
        schemes["bearerAuth"] = bearer

    raw = json.dumps(spec)
    raw = raw.replace("HTTPBearer", "bearerAuth")
    spec.clear()
    spec.update(json.loads(raw))


def export_openapi() -> dict:
    spec = app.openapi()
    spec["openapi"] = "3.1.0"
    _normalize_security(spec)

    spec["info"] = {
        "title": "Enterprise E-Commerce API",
        "version": "0.1.0",
        "description": "REST API for catalog, checkout, orders, and payments.",
    }
    spec["servers"] = [
        {"url": "http://localhost:8000", "description": "Local development"},
    ]
    return spec


def main() -> None:
    spec = export_openapi()
    with OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        yaml.dump(
            spec,
            handle,
            sort_keys=False,
            allow_unicode=True,
            width=120,
            default_flow_style=False,
        )
    print(f"Wrote {OUTPUT_PATH} ({len(spec.get('paths', {}))} paths)")


if __name__ == "__main__":
    main()
