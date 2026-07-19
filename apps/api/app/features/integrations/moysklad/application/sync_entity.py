"""Sync a single MoySklad entity after webhook notification (read-only pull)."""

import logging
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.integrations.moysklad.application.import_catalog import (
    ImportCatalogResult,
    ImportMoySkladCatalogUseCase,
)
from app.features.integrations.moysklad.infrastructure.persistence.catalog_sync_repository import (
    CatalogSyncRepository,
)
from app.features.integrations.moysklad.infrastructure.persistence.sync_repository import (
    SyncStateRepository,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class EntitySyncOutcome:
    handled: bool
    action: str
    entity_type: str
    entity_id: str


class SyncMoySkladEntityUseCase:
    """Fetch one product/variant from MoySklad and upsert locally — read-only."""

    def __init__(
        self,
        importer: ImportMoySkladCatalogUseCase,
        catalog_repo: CatalogSyncRepository,
    ) -> None:
        self._importer = importer
        self._catalog = catalog_repo

    async def sync_product(self, product_id: str, *, action: str) -> EntitySyncOutcome:
        if action == "DELETE":
            await self._archive_product(product_id)
            return EntitySyncOutcome(True, action, "product", product_id)

        ms_product = await self._importer._client.get_product(product_id)
        if ms_product is None:
            return EntitySyncOutcome(False, action, "product", product_id)

        variants = await self._importer._client.list_variants_for_product(product_id)
        result = ImportCatalogResult()
        await self._importer.import_product_with_variants(ms_product, variants, result)
        await self._sync_assortment_stock(product_id)
        return EntitySyncOutcome(True, action, "product", product_id)

    async def sync_variant(self, variant_id: str, *, action: str) -> EntitySyncOutcome:
        if action == "DELETE":
            await self._archive_variant(variant_id)
            return EntitySyncOutcome(True, action, "variant", variant_id)

        ms_variant = await self._importer._client.get_variant(variant_id)
        if ms_variant is None:
            return EntitySyncOutcome(False, action, "variant", variant_id)

        ms_product = await self._importer._client.get_product(ms_variant.product_external_id)
        if ms_product is None:
            return EntitySyncOutcome(False, action, "variant", variant_id)

        all_variants = await self._importer._client.list_variants_for_product(
            ms_variant.product_external_id
        )
        result = ImportCatalogResult()
        await self._importer.import_product_with_variants(ms_product, all_variants, result)
        await self._sync_assortment_stock(variant_id)
        return EntitySyncOutcome(True, action, "variant", variant_id)

    async def _archive_product(self, product_id: str) -> None:
        product = await self._catalog.get_product_by_ms_id(product_id)
        if product is None:
            return
        product.status = "archived"
        await self._catalog._session.flush()

    async def _archive_variant(self, variant_id: str) -> None:
        variant = await self._catalog.get_variant_by_ms_id(variant_id)
        if variant is None:
            return
        variant.in_stock = False
        await self._catalog._session.flush()

    async def _sync_assortment_stock(self, assortment_id: str) -> None:
        client = self._importer._client
        quantity = await client.get_assortment_stock(assortment_id)
        variant = await self._catalog.get_variant_by_ms_id(assortment_id)
        if variant is not None:
            await self._catalog.apply_stock(variant, quantity)
            return
        pseudo_id = f"product:{assortment_id}"
        variant = await self._catalog.get_variant_by_ms_id(pseudo_id)
        if variant is not None:
            await self._catalog.apply_stock(variant, quantity)


async def run_entity_sync(
    session: AsyncSession,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
) -> EntitySyncOutcome:
    from app.features.integrations.moysklad.infrastructure.http_client import build_moysklad_client

    client = build_moysklad_client()
    if client is None:
        raise RuntimeError("MOYSKLAD_API_TOKEN is not configured")

    catalog_repo = CatalogSyncRepository(session)
    sync_repo = SyncStateRepository(session)
    importer = ImportMoySkladCatalogUseCase(client, catalog_repo, sync_repo)
    use_case = SyncMoySkladEntityUseCase(importer, catalog_repo)

    try:
        if entity_type == "product":
            return await use_case.sync_product(entity_id, action=action)
        if entity_type == "variant":
            return await use_case.sync_variant(entity_id, action=action)
        return EntitySyncOutcome(False, action, entity_type, entity_id)
    finally:
        await client.close()
