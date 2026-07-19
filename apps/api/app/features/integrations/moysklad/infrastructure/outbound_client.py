"""Outbound MoySklad HTTP client — order export only (POST)."""

import asyncio
import logging
from typing import Any
import httpx

from app.core.config import settings
from app.features.integrations.moysklad.domain.order_export_ports import (
    IMoySkladOrderExportClient,
    OrderExportLine,
)

logger = logging.getLogger(__name__)

_MS_BASE = "https://api.moysklad.ru/api/remap/1.2"


def _entity_meta(base_url: str, entity_type: str, entity_id: str) -> dict[str, str]:
    return {
        "href": f"{base_url}/entity/{entity_type}/{entity_id}",
        "type": entity_type,
        "mediaType": "application/json",
    }


class MoySkladOutboundClient(IMoySkladOrderExportClient):
    """POST-only client for customer orders and counterparties."""

    def __init__(self, token: str, *, base_url: str = _MS_BASE) -> None:
        self._token = token
        self._base_url = base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                headers={
                    "Authorization": f"Bearer {self._token}",
                    "Accept-Encoding": "gzip",
                    "Content-Type": "application/json",
                },
                timeout=httpx.Timeout(30.0),
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        client = await self._get_client()
        for attempt in range(4):
            response = await client.request(method, path, **kwargs)
            if response.status_code == 429:
                wait = 2**attempt
                logger.warning("moysklad_outbound_rate_limited", extra={"wait_seconds": wait})
                await asyncio.sleep(wait)
                continue
            response.raise_for_status()
            if response.status_code == 204:
                return {}
            return response.json()
        response.raise_for_status()
        return {}

    async def get_default_organization_id(self) -> str | None:
        configured = settings.moysklad_organization_id.strip()
        if configured:
            return configured
        payload = await self._request("GET", "/entity/organization", params={"limit": 1})
        rows = payload.get("rows") or []
        if not rows:
            return None
        href = (rows[0].get("meta") or {}).get("href", "")
        return href.rstrip("/").split("/")[-1] if href else None

    async def find_counterparty_by_email(self, email: str) -> str | None:
        payload = await self._request(
            "GET",
            "/entity/counterparty",
            params={"filter": f"email={email}", "limit": 1},
        )
        rows = payload.get("rows") or []
        if not rows:
            return None
        href = (rows[0].get("meta") or {}).get("href", "")
        return href.rstrip("/").split("/")[-1] if href else None

    async def create_counterparty(self, *, email: str, name: str) -> str:
        row = await self._request(
            "POST",
            "/entity/counterparty",
            json={"name": name, "email": email},
        )
        href = (row.get("meta") or {}).get("href", "")
        if not href:
            raise RuntimeError("MoySklad counterparty response missing meta.href")
        return href.rstrip("/").split("/")[-1]

    async def create_customer_order(
        self,
        *,
        order_number: str,
        organization_id: str,
        counterparty_id: str,
        store_id: str,
        lines: tuple[OrderExportLine, ...],
        description: str | None = None,
    ) -> str:
        positions = [
            {
                "quantity": line.quantity,
                "price": line.unit_price_cents,
                "assortment": {"meta": _entity_meta(self._base_url, line.assortment_type, line.moysklad_assortment_id)},
            }
            for line in lines
        ]
        body: dict[str, Any] = {
            "name": order_number,
            "externalCode": order_number,
            "organization": {"meta": _entity_meta(self._base_url, "organization", organization_id)},
            "agent": {"meta": _entity_meta(self._base_url, "counterparty", counterparty_id)},
            "store": {"meta": _entity_meta(self._base_url, "store", store_id)},
            "positions": positions,
        }
        if description:
            body["description"] = description

        row = await self._request("POST", "/entity/customerorder", json=body)
        href = (row.get("meta") or {}).get("href", "")
        if not href:
            raise RuntimeError("MoySklad customerorder response missing meta.href")
        return href.rstrip("/").split("/")[-1]


def build_moysklad_outbound_client() -> MoySkladOutboundClient | None:
    if not settings.moysklad_order_export_enabled:
        return None
    token = settings.moysklad_api_token.get_secret_value()
    if not token or not settings.moysklad_store_id:
        return None
    return MoySkladOutboundClient(token)
