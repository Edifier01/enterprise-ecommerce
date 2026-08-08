"""Catalog adapters for inventory cross-context ports."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.catalog.domain.ports import IStorefrontAvailabilityPort, IVariantSourcePort
from app.features.catalog.domain.stock_availability import is_in_stock_for_storefront
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel


class VariantSourceAdapter(IVariantSourcePort):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def is_erp_managed(self, variant_id: UUID) -> bool:
        sync_source = await self._session.scalar(
            select(ProductModel.sync_source)
            .join(ProductVariantModel, ProductVariantModel.product_id == ProductModel.id)
            .where(ProductVariantModel.id == variant_id)
        )
        return sync_source == "moysklad"


class StorefrontAvailabilityAdapter(IStorefrontAvailabilityPort):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def apply_availability(self, variant_id: UUID, available: int) -> None:
        variant = await self._session.get(ProductVariantModel, variant_id)
        if variant is None:
            return
        variant.in_stock = is_in_stock_for_storefront(available)
        product = await self._session.get(ProductModel, variant.product_id)
        if product is None:
            await self._session.flush()
            return
        any_in_stock = await self._session.scalar(
            select(ProductVariantModel.in_stock).where(
                ProductVariantModel.product_id == product.id,
                ProductVariantModel.in_stock.is_(True),
            )
        )
        product.in_stock = any_in_stock is not None
        await self._session.flush()
