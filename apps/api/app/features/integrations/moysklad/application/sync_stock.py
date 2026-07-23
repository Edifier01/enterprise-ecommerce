"""Sync stock quantities from MoySklad (read-only pull)."""

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.catalog.infrastructure.persistence.models import ProductVariantModel
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
        variants = (
            await session.scalars(
                select(ProductVariantModel).where(ProductVariantModel.moysklad_variant_id.is_not(None))
            )
        ).all()

        if not stock_map and variants:
            logger.warning(
                "moysklad_stock_sync_empty_map",
                extra={"variant_count": len(variants)},
            )

        for variant in variants:
            try:
                ms_id = variant.moysklad_variant_id or ""
                quantity = stock_map.get(ms_id)
                if quantity is None and ms_id.startswith("product:"):
                    quantity = stock_map.get(ms_id.removeprefix("product:"))
                if quantity is None:
                    result.rows_skipped += 1
                    continue
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
                "stock_map_size": result.stock_map_size,
                "errors": len(result.errors),
            },
        )

        state = await self._sync.get_state()
        state.last_incremental_sync_at = datetime.now(tz=UTC)
        state.last_error = result.errors[0] if result.errors else None
        await self._sync.log_event(
            direction="inbound",
            entity_type="stock_sync",
            entity_id=None,
            status="success" if not result.errors else "partial",
            error_message="; ".join(result.errors[:3]) if result.errors else None,
        )
        return result

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
