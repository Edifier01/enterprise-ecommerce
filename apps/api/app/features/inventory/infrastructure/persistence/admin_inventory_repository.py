"""Admin inventory repository — list and adjust with variant/product joins."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.catalog.domain.stock_availability import is_in_stock_for_storefront
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.integrations.moysklad.domain.sync_guard import assert_inventory_adjust_allowed
from app.features.inventory.domain.admin_ports import (
    AdminInventoryRow,
    IAdminInventoryRepository,
    InsufficientOnHandError,
    InventoryItemNotFoundError,
    VersionConflictError,
)
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel


class AdminInventoryRepository(IAdminInventoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _available_expr(self):
        return InventoryItemModel.quantity_on_hand - InventoryItemModel.quantity_reserved

    def _base_stmt(self):
        available = self._available_expr()
        return (
            select(
                InventoryItemModel,
                ProductVariantModel.sku,
                ProductModel.name.label("product_name"),
                available.label("available"),
            )
            .join(ProductVariantModel, ProductVariantModel.id == InventoryItemModel.variant_id)
            .join(ProductModel, ProductModel.id == ProductVariantModel.product_id)
        )

    async def list_inventory(
        self,
        *,
        page: int,
        limit: int,
        low_stock_only: bool,
        low_stock_threshold: int,
    ) -> tuple[list[AdminInventoryRow], int]:
        offset = (page - 1) * limit
        available = self._available_expr()
        base = self._base_stmt()

        count_stmt = select(func.count()).select_from(InventoryItemModel)
        if low_stock_only:
            count_stmt = (
                select(func.count())
                .select_from(InventoryItemModel)
                .where(available <= low_stock_threshold)
            )
            base = base.where(available <= low_stock_threshold)

        total = int((await self._session.scalar(count_stmt)) or 0)
        stmt = base.order_by(ProductVariantModel.sku).offset(offset).limit(limit)
        rows = (await self._session.execute(stmt)).all()

        items = [
            AdminInventoryRow(
                variant_id=item.variant_id,
                sku=sku,
                product_name=product_name,
                quantity_on_hand=item.quantity_on_hand,
                quantity_reserved=item.quantity_reserved,
                available=int(available_qty),
                version=item.version,
                is_low_stock=int(available_qty) <= low_stock_threshold,
            )
            for item, sku, product_name, available_qty in rows
        ]
        return items, total

    async def adjust_quantity_on_hand(
        self,
        variant_id: UUID,
        quantity_on_hand: int,
        expected_version: int,
        low_stock_threshold: int,
    ) -> AdminInventoryRow:
        stmt = (
            self._base_stmt()
            .where(InventoryItemModel.variant_id == variant_id)
            .with_for_update()
        )
        row = (await self._session.execute(stmt)).first()
        if row is None:
            raise InventoryItemNotFoundError(str(variant_id))

        item, sku, product_name, available_qty = row
        if item.version != expected_version:
            raise VersionConflictError()
        if quantity_on_hand < item.quantity_reserved:
            raise InsufficientOnHandError(item.quantity_reserved)

        product = await self._session.scalar(
            select(ProductModel.sync_source)
            .join(ProductVariantModel, ProductVariantModel.product_id == ProductModel.id)
            .where(ProductVariantModel.id == variant_id)
        )
        assert_inventory_adjust_allowed(product or "manual")

        item.quantity_on_hand = quantity_on_hand
        item.version += 1

        variant = await self._session.get(ProductVariantModel, variant_id)
        if variant is not None:
            new_available = item.quantity_on_hand - item.quantity_reserved
            variant.in_stock = is_in_stock_for_storefront(new_available)
            product = await self._session.get(ProductModel, variant.product_id)
            if product is not None:
                any_in_stock = (
                    await self._session.scalar(
                        select(ProductVariantModel.in_stock).where(
                            ProductVariantModel.product_id == product.id,
                            ProductVariantModel.in_stock.is_(True),
                        )
                    )
                )
                product.in_stock = any_in_stock is not None

        await self._session.flush()

        new_available = item.quantity_on_hand - item.quantity_reserved
        return AdminInventoryRow(
            variant_id=item.variant_id,
            sku=sku,
            product_name=product_name,
            quantity_on_hand=item.quantity_on_hand,
            quantity_reserved=item.quantity_reserved,
            available=new_available,
            version=item.version,
            is_low_stock=new_available <= low_stock_threshold,
        )
