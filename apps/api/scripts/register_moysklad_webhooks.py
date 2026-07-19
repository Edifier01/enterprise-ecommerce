"""Enable MoySklad inbound webhooks after first catalog import.

Registers webhook subscriptions IN MOYSKLAD (one-time ops script — not exposed in admin).

Usage:
    cd apps/api
    python -m scripts.register_moysklad_webhooks --url https://your-domain.com/api/v1/integrations/moysklad/webhook
"""

import argparse
import asyncio

import httpx

from app.core.config import settings

_MS_BASE = "https://api.moysklad.ru/api/remap/1.2"
_ENTITIES = ("product", "variant", "customerorder")
_ACTIONS = ("CREATE", "UPDATE", "DELETE")


async def register_webhooks(callback_url: str) -> None:
    token = settings.moysklad_api_token.get_secret_value()
    if not token:
        raise RuntimeError("MOYSKLAD_API_TOKEN is not configured")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
    }

    async with httpx.AsyncClient(base_url=_MS_BASE, headers=headers, timeout=30) as client:
        for entity in _ENTITIES:
            for action in _ACTIONS:
                body = {
                    "url": callback_url,
                    "entityType": entity,
                    "action": action,
                }
                response = await client.post("/entity/webhook", json=body)
                if response.status_code == 412:
                    print(f"skip existing webhook {entity}/{action}")
                    continue
                response.raise_for_status()
                print(f"registered webhook {entity}/{action}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Register MoySklad inbound webhooks")
    parser.add_argument("--url", required=True, help="Public webhook callback URL")
    args = parser.parse_args()
    asyncio.run(register_webhooks(args.url))


if __name__ == "__main__":
    main()
