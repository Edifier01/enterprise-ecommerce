"""Import catalog from MoySklad (ADR-010 Phase 2)."""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.integrations.moysklad.application.sync_stock import SyncMoySkladStockUseCase
from app.features.integrations.moysklad.domain.ports import IMoySkladClient
from app.features.integrations.moysklad.infrastructure.persistence.catalog_sync_repository import (
    CatalogSyncRepository,
)
from app.features.integrations.moysklad.infrastructure.persistence.sync_repository import (
    SyncStateRepository,
)

logger = logging.getLogger(__name__)

_PAGE_SIZE = 100


@dataclass(slots=True)
class ImportCatalogResult:
    products_created: int = 0
    products_updated: int = 0
    variants_created: int = 0
    variants_updated: int = 0
    stock_rows_applied: int = 0
    errors: list[str] = field(default_factory=list)


class ImportMoySkladCatalogUseCase:
    def __init__(
        self,
        client: IMoySkladClient,
        catalog_repo: CatalogSyncRepository,
        sync_repo: SyncStateRepository,
    ) -> None:
        self._client = client
        self._catalog = catalog_repo
        self._sync = sync_repo

    async def execute(self) -> ImportCatalogResult:
        result = ImportCatalogResult()
        variants_by_product: dict[str, list] = defaultdict(list)

        try:
            offset = 0
            while True:
                batch, total = await self._client.list_variants(offset=offset, limit=_PAGE_SIZE)
                for variant in batch:
                    if variant.product_external_id:
                        variants_by_product[variant.product_external_id].append(variant)
                offset += len(batch)
                if offset >= total or not batch:
                    break

            offset = 0
            while True:
                products, total = await self._client.list_products(offset=offset, limit=_PAGE_SIZE)
                for ms_product in products:
                    try:
                        await self.import_product_with_variants(
                            ms_product,
                            variants_by_product.get(ms_product.external_id, []),
                            result,
                        )
                    except Exception as exc:
                        message = f"product {ms_product.external_id}: {exc}"
                        logger.exception("moysklad_import_product_failed", extra={"error": message})
                        result.errors.append(message)
                        await self._sync.log_event(
                            direction="inbound",
                            entity_type="product",
                            entity_id=ms_product.external_id,
                            status="error",
                            error_message=message,
                        )
                offset += len(products)
                if offset >= total or not products:
                    break

            stock_sync = SyncMoySkladStockUseCase(self._client, self._catalog, self._sync)
            stock_result = await stock_sync.execute()
            result.stock_rows_applied = stock_result.rows_applied
            result.errors.extend(stock_result.errors)

            state = await self._sync.get_state()
            now = datetime.now(tz=UTC)
            state.last_full_sync_at = now
            state.last_incremental_sync_at = now
            state.last_error = result.errors[0] if result.errors else None
            await self._sync.log_event(
                direction="inbound",
                entity_type="catalog_import",
                entity_id=None,
                status="success" if not result.errors else "partial",
                error_message="; ".join(result.errors[:3]) if result.errors else None,
            )
        except Exception as exc:
            state = await self._sync.get_state()
            state.last_error = str(exc)
            await self._sync.log_event(
                direction="inbound",
                entity_type="catalog_import",
                entity_id=None,
                status="error",
                error_message=str(exc),
            )
            raise

        return result

    async def import_product_with_variants(
        self,
        ms_product,
        ms_variants: list,
        result: ImportCatalogResult,
    ) -> None:
        await self._import_product(ms_product, ms_variants, result)

    async def _import_product(self, ms_product, ms_variants, result: ImportCatalogResult) -> None:
        has_variants = len(ms_variants) > 0
        product, created = await self._catalog.upsert_product(
            ms_product,
            has_variants=has_variants,
        )
        if created:
            result.products_created += 1
        else:
            result.products_updated += 1

        if has_variants:
            active_variants = sorted(
                [v for v in ms_variants if not v.archived],
                key=lambda item: item.name,
            )
            archived_variants = [v for v in ms_variants if v.archived]
            ordered = active_variants + archived_variants
            for index, ms_variant in enumerate(ordered):
                _, variant_created = await self._catalog.upsert_variant(
                    product,
                    ms_variant,
                    is_default=index == 0,
                    sort_order=index,
                )
                if variant_created:
                    result.variants_created += 1
                else:
                    result.variants_updated += 1
        else:
            _, variant_created = await self._catalog.upsert_default_variant_from_product(
                product,
                ms_product,
            )
            if variant_created:
                result.variants_created += 1
            else:
                result.variants_updated += 1


async def run_moysklad_catalog_import(session: AsyncSession) -> ImportCatalogResult:
    from app.features.integrations.moysklad.infrastructure.http_client import build_moysklad_client

    client = build_moysklad_client()
    if client is None:
        raise RuntimeError("MOYSKLAD_API_TOKEN is not configured")

    use_case = ImportMoySkladCatalogUseCase(
        client=client,
        catalog_repo=CatalogSyncRepository(session),
        sync_repo=SyncStateRepository(session),
    )
    try:
        return await use_case.execute()
    finally:
        await client.close()
