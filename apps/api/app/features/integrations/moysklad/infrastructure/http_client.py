"""HTTP client for MoySklad JSON API 1.2."""

import asyncio
import logging
from typing import Any

import httpx

from app.core.config import settings
from app.features.integrations.moysklad.domain.ports import (
    IMoySkladClient,
    MoySkladProduct,
    MoySkladVariant,
)
from app.features.integrations.moysklad.infrastructure.ids import (
    extract_moysklad_id,
    normalize_moysklad_entity_id,
    parse_stock_report_rows,
)

logger = logging.getLogger(__name__)

_MS_BASE = "https://api.moysklad.ru/api/remap/1.2"


def _extract_id(href: str | None) -> str | None:
    return extract_moysklad_id(href)


class MoySkladApiClient(IMoySkladClient):
    """Read-only async MoySklad API adapter (GET only — never mutates MS)."""

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
        if method.upper() != "GET":
            raise RuntimeError("MoySklad integration is read-only; mutating requests are forbidden")
        client = await self._get_client()
        for attempt in range(4):
            response = await client.request(method, path, **kwargs)
            if response.status_code == 429:
                wait = 2**attempt
                logger.warning("moysklad_rate_limited", extra={"wait_seconds": wait})
                await asyncio.sleep(wait)
                continue
            response.raise_for_status()
            if response.status_code == 204:
                return {}
            return response.json()
        response.raise_for_status()
        return {}

    async def get_entity(self, href: str) -> dict[str, Any]:
        if href.startswith("http"):
            path = href.replace(self._base_url, "")
        else:
            path = href
        return await self._request("GET", path)

    async def get_product(self, product_id: str) -> MoySkladProduct | None:
        try:
            row = await self._request(
                "GET",
                f"/entity/product/{product_id}",
                params={"expand": "productFolder,images,salePrices"},
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                return None
            raise
        return self._map_product(row)

    async def get_variant(self, variant_id: str) -> MoySkladVariant | None:
        try:
            row = await self._request(
                "GET",
                f"/entity/variant/{variant_id}",
                params={"expand": "product,characteristics,salePrices"},
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                return None
            raise
        return self._map_variant(row)

    async def list_variants_for_product(self, product_id: str) -> list[MoySkladVariant]:
        product_href = f"{self._base_url}/entity/product/{product_id}"
        variants: list[MoySkladVariant] = []
        offset = 0
        while True:
            payload = await self._request(
                "GET",
                "/entity/variant",
                params={
                    "limit": 100,
                    "offset": offset,
                    "filter": f"product={product_href}",
                    "expand": "product,characteristics,salePrices",
                },
            )
            rows = payload.get("rows", [])
            variants.extend(self._map_variant(row) for row in rows)
            total = int(payload.get("meta", {}).get("size", len(rows)))
            offset += len(rows)
            if offset >= total or not rows:
                break
        return variants

    async def get_assortment_stock(self, assortment_id: str) -> int:
        offset = 0
        while True:
            batch, total, rows_returned = await self.list_stock_by_store(offset=offset, limit=1000)
            if assortment_id in batch:
                return batch[assortment_id]
            offset += rows_returned
            if offset >= total or rows_returned == 0:
                break
        return 0

    async def get_customer_order(self, order_id: str) -> dict[str, str | bool | None] | None:
        try:
            row = await self._request(
                "GET",
                f"/entity/customerorder/{order_id}",
                params={"expand": "state"},
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                return None
            raise
        state = row.get("state") or {}
        state_name = state.get("name") if isinstance(state, dict) else None
        return {
            "id": order_id,
            "name": row.get("name"),
            "deleted": bool(row.get("deleted")),
            "state_name": state_name,
        }

    async def list_products(self, *, offset: int = 0, limit: int = 100) -> tuple[list[MoySkladProduct], int]:
        payload = await self._request(
            "GET",
            "/entity/product",
            params={"limit": limit, "offset": offset, "expand": "productFolder,images,salePrices"},
        )
        rows = payload.get("rows", [])
        total = int(payload.get("meta", {}).get("size", len(rows)))
        products = [self._map_product(row) for row in rows]
        return products, total

    async def list_variants(self, *, offset: int = 0, limit: int = 100) -> tuple[list[MoySkladVariant], int]:
        payload = await self._request(
            "GET",
            "/entity/variant",
            params={
                "limit": limit,
                "offset": offset,
                "expand": "product,characteristics,salePrices",
            },
        )
        rows = payload.get("rows", [])
        total = int(payload.get("meta", {}).get("size", len(rows)))
        variants = [self._map_variant(row) for row in rows]
        return variants, total

    async def list_stock_by_store(
        self, *, offset: int = 0, limit: int = 1000
    ) -> tuple[dict[str, int], int, int]:
        store_id = normalize_moysklad_entity_id(settings.moysklad_store_id)
        if not store_id:
            return {}, 0, 0

        store_href = f"{self._base_url}/entity/store/{store_id}"
        params = {
            "limit": limit,
            "offset": offset,
            "groupBy": "variant",
            "filter": f"store={store_href}",
        }

        # Prefer /report/stock/all — returns flat stock on rows when filtered by store.
        payload = await self._request("GET", "/report/stock/all", params=params)
        rows = payload.get("rows", [])
        if not rows and offset == 0:
            logger.info("moysklad_stock_all_empty_fallback_to_bystore")
            payload = await self._request("GET", "/report/stock/bystore", params=params)
            rows = payload.get("rows", [])

        total = int(payload.get("meta", {}).get("size", len(rows)))
        stock = parse_stock_report_rows(rows, store_id)
        return stock, total, len(rows)

    async def get_variant_stock(self, variant_external_id: str) -> int:
        stock, _, _ = await self.list_stock_by_store(offset=0, limit=1000)
        return stock.get(variant_external_id, 0)

    def _map_product(self, row: dict[str, Any]) -> MoySkladProduct:
        folder = row.get("productFolder") or {}
        images = row.get("images") or {}
        image_rows = images.get("rows") or []
        image_url = None
        if image_rows:
            meta = image_rows[0].get("meta") or {}
            download_href = meta.get("downloadHref")
            if download_href:
                image_url = download_href

        retail_cents, wholesale_cents = self._resolve_prices(row.get("salePrices") or [])
        weight = row.get("weight")
        weight_grams = int(weight) if weight is not None else None
        barcodes = row.get("barcodes") or []
        barcode = None
        if barcodes:
            first = barcodes[0]
            barcode = first.get("ean13") or first.get("ean8") or first.get("code")

        return MoySkladProduct(
            external_id=_extract_id((row.get("meta") or {}).get("href", "")) or row.get("id", ""),
            name=row.get("name", ""),
            code=row.get("code"),
            archived=bool(row.get("archived")),
            folder_id=_extract_id(folder.get("meta", {}).get("href") if isinstance(folder, dict) else None),
            image_url=image_url,
            retail_price_cents=retail_cents,
            wholesale_price_cents=wholesale_cents,
            barcode=barcode,
            weight_grams=weight_grams,
        )

    def _map_variant(self, row: dict[str, Any]) -> MoySkladVariant:
        product_meta = (row.get("product") or {}).get("meta") or {}
        characteristics = row.get("characteristics") or []
        attributes: dict[str, str] = {}
        for char in characteristics:
            name = char.get("name")
            value = char.get("value")
            if name and value is not None:
                key = str(name).casefold()
                if key in {"размер", "size"}:
                    key = "size"
                elif key in {"цвет", "color"}:
                    key = "color"
                attributes[key] = str(value)

        retail_cents, wholesale_cents = self._resolve_prices(row.get("salePrices") or [])

        weight = row.get("weight")
        weight_grams = int(weight) if weight is not None else None

        return MoySkladVariant(
            external_id=_extract_id((row.get("meta") or {}).get("href", "")) or row.get("id", ""),
            product_external_id=_extract_id(product_meta.get("href", "")) or "",
            name=row.get("name", ""),
            sku=row.get("code") or row.get("name", ""),
            archived=bool(row.get("archived")),
            attributes=attributes,
            retail_price_cents=retail_cents,
            wholesale_price_cents=wholesale_cents,
            barcode=row.get("barcodes", [{}])[0].get("ean13") if row.get("barcodes") else None,
            weight_grams=weight_grams,
            dimensions_cm=None,
        )

    def _resolve_prices(self, sale_prices: list[dict[str, Any]]) -> tuple[int, int | None]:
        retail_type = settings.moysklad_retail_price_type.casefold()
        wholesale_type = settings.moysklad_wholesale_price_type.casefold()

        retail_cents = 0
        wholesale_cents: int | None = None
        fallback_retail = 0

        for entry in sale_prices:
            price_type = entry.get("priceType") or {}
            type_name = (price_type.get("name") or "").casefold()
            raw_value = entry.get("value")
            cents = int(float(raw_value)) if raw_value is not None else 0

            if cents > 0 and fallback_retail == 0:
                fallback_retail = cents

            if type_name == retail_type or retail_type in type_name:
                retail_cents = cents
            elif type_name == wholesale_type or wholesale_type in type_name:
                wholesale_cents = cents

        if retail_cents == 0:
            retail_cents = fallback_retail

        if wholesale_cents is not None and wholesale_cents > retail_cents:
            wholesale_cents = None

        return retail_cents, wholesale_cents


def build_moysklad_client() -> MoySkladApiClient | None:
    token = settings.moysklad_api_token.get_secret_value()
    if not token:
        return None
    return MoySkladApiClient(token)
