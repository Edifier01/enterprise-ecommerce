"""Generate production secrets for JWT.

Usage:
    python -m scripts.generate_production_secrets

Prints key=value lines suitable for appending to .env.production
"""

from __future__ import annotations

import secrets


def generate_jwt_secret() -> str:
    return secrets.token_hex(32)


def main() -> None:
    print("# Generated secrets — review and copy into .env.production")
    print(f"JWT_SECRET_KEY={generate_jwt_secret()}")


if __name__ == "__main__":
    main()
