"""Sync stock quantities from MoySklad (read-only pull)."""

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.integrations.moysklad.domain.ports import IMoySkladClient
from app.features.integrations.moysklad.infrastructure.persistence.catalog_sync_repository import (
    CatalogSyncRepository,
)
from app.features.integrations.moysklad.infrastructure.persistence.sync_repository import (
    SyncStateRepository,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class SyncStockResult:
    rows_applied: int = 0
    rows_skipped: int = 0
    rows_fetched_direct: int = 0
    stock_map_size: int = 0
    errors: list[str] = field(default_factory=list)


class SyncMoySkladStockUseCase:
    """Pull stock from MoySklad into local inventory — never writes to MS."""

    def __init__(
        self,
        client: IMoySkladClient,
        catalog_repo: CatalogSyncRepository,
        sync_repo: SyncStateRepository,
    ) -> None:
        self._client = client
        self._catalog = catalog_repo
        self._sync = sync_repo

    async def execute(self) -> SyncStockResult:
        result = SyncStockResult()
        stock_map = await self._load_stock_map()
        result.stock_map_size = len(stock_map)
        session = self._catalog._session

        rows = (
            await session.execute(
                select(ProductVariantModel, ProductModel.moysklad_product_id).join(
                    ProductModel, ProductVariantModel.product_id == ProductModel.id
                ).where(ProductModel.sync_source == "moysklad")
            )
        ).all()

        if not stock_map and rows:
            logger.warning(
                "moysklad_stock_sync_empty_map",
                extra={"variant_count": len(rows)},
            )

        for variant, product_ms_id in rows:
            try:
                ms_id = await self._ensure_ms_variant_id(variant, product_ms_id)
                if not ms_id:
                    result.rows_skipped += 1
                    continue

                quantity = self._lookup_quantity(stock_map, ms_id, product_ms_id)
                if quantity is None:
                    quantity = await self._client.get_assortment_stock(ms_id)
                    result.rows_fetched_direct += 1

                await self._catalog.apply_stock(variant, quantity)
                result.rows_applied += 1
            except Exception as exc:
                message = f"variant {variant.id}: {exc}"
                logger.exception("moysklad_stock_sync_failed")
                result.errors.append(message)

        logger.info(
            "moysklad_stock_sync_complete",
            extra={
                "rows_applied": result.rows_applied,
                "rows_skipped": result.rows_skipped,
                "rows_fetched_direct": result.rows_fetched_direct,
                "stock_map_size": result.stock_map_size,
                "errors": len(result.errors),
            },
        )

        state = await self._sync.get_state()
        state.last_incremental_sync_at = datetime.now(tz=UTC)
        if result.errors:
            state.last_error = result.errors[0]
        elif result.rows_applied == 0 and rows:
            state.last_error = (
                f"stock sync applied 0 rows (map={result.stock_map_size}, "
                f"skipped={result.rows_skipped}, variants={len(rows)})"
            )
        else:
            state.last_error = None
        await self._sync.log_event(
            direction="inbound",
            entity_type="stock_sync",
            entity_id=None,
            status="success" if not result.errors else "partial",
            error_message=state.last_error,
        )
        return result

    async def _ensure_ms_variant_id(
        self,
        variant: ProductVariantModel,
        product_ms_id: str | None,
    ) -> str | None:
        if variant.moysklad_variant_id:
            return variant.moysklad_variant_id
        if not product_ms_id:
            return None
        pseudo_id = f"product:{product_ms_id}"
        variant.moysklad_variant_id = pseudo_id
        await self._catalog._session.flush()
        return pseudo_id

    @staticmethod
    def _lookup_quantity(
        stock_map: dict[str, int],
        ms_variant_id: str,
        product_ms_id: str | None,
    ) -> int | None:
        if ms_variant_id in stock_map:
            return stock_map[ms_variant_id]
        if ms_variant_id.startswith("product:"):
            product_id = ms_variant_id.removeprefix("product:")
            if product_id in stock_map:
                return stock_map[product_id]
        if product_ms_id and product_ms_id in stock_map:
            return stock_map[product_ms_id]
        return None

    async def _load_stock_map(self) -> dict[str, int]:
        stock: dict[str, int] = {}
        offset = 0
        while True:
            batch, total, rows_returned = await self._client.list_stock_by_store(
                offset=offset, limit=1000
            )
            stock.update(batch)
            offset += rows_returned
            if offset >= total or rows_returned == 0:
                break
        return stock


async def run_moysklad_stock_sync(session: AsyncSession) -> SyncStockResult:
    from app.features.integrations.moysklad.infrastructure.http_client import build_moysklad_client

    client = build_moysklad_client()
    if client is None:
        raise RuntimeError("MOYSKLAD_API_TOKEN is not configured")

    use_case = SyncMoySkladStockUseCase(
        client=client,
        catalog_repo=CatalogSyncRepository(session),
        sync_repo=SyncStateRepository(session),
    )
    try:
        return await use_case.execute()
    finally:
        await client.close()
