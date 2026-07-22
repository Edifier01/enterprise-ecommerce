"""Admin inventory repository — list and adjust with variant/product joins."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.catalog.domain.stock_availability import is_in_stock_for_storefront
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.integrations.moysklad.domain.sync_guard import assert_inventory_adjust_allowed
from app.features.inventory.domain.admin_ports import (
    AdminInventoryOverview,
    AdminInventoryProductGroup,
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
                ProductVariantModel.product_id,
                ProductVariantModel.sku,
                ProductModel.name.label("product_name"),
                ProductModel.sync_source,
                available.label("available"),
            )
            .join(ProductVariantModel, ProductVariantModel.id == InventoryItemModel.variant_id)
            .join(ProductModel, ProductModel.id == ProductVariantModel.product_id)
        )

    def _filtered_stmt(
        self,
        *,
        low_stock_only: bool,
        low_stock_threshold: int,
        sku_query: str | None,
    ):
        available = self._available_expr()
        stmt = self._base_stmt()
        if sku_query:
            pattern = f"%{sku_query.strip()}%"
            stmt = stmt.where(
                ProductVariantModel.sku.ilike(pattern) | ProductModel.name.ilike(pattern)
            )
        if low_stock_only:
            stmt = stmt.where(available <= low_stock_threshold)
        return stmt

    def _row_from_result(
        self,
        row,
        *,
        low_stock_threshold: int,
    ) -> AdminInventoryRow:
        item, product_id, sku, product_name, sync_source, available_qty = row
        available = int(available_qty)
        return AdminInventoryRow(
            variant_id=item.variant_id,
            product_id=product_id,
            sku=sku,
            product_name=product_name,
            sync_source=sync_source,
            quantity_on_hand=item.quantity_on_hand,
            quantity_reserved=item.quantity_reserved,
            available=available,
            version=item.version,
            is_low_stock=available <= low_stock_threshold,
        )

    async def list_inventory(
        self,
        *,
        page: int,
        limit: int,
        low_stock_only: bool,
        low_stock_threshold: int,
        sku_query: str | None = None,
    ) -> tuple[list[AdminInventoryRow], int]:
        offset = (page - 1) * limit
        base = self._filtered_stmt(
            low_stock_only=low_stock_only,
            low_stock_threshold=low_stock_threshold,
            sku_query=sku_query,
        )

        count_stmt = select(func.count()).select_from(base.subquery())
        total = int((await self._session.scalar(count_stmt)) or 0)
        stmt = base.order_by(ProductVariantModel.sku).offset(offset).limit(limit)
        rows = (await self._session.execute(stmt)).all()

        items = [
            self._row_from_result(row, low_stock_threshold=low_stock_threshold) for row in rows
        ]
        return items, total

    async def list_inventory_grouped_by_product(
        self,
        *,
        page: int,
        limit: int,
        low_stock_only: bool,
        low_stock_threshold: int,
        sku_query: str | None = None,
    ) -> tuple[list[AdminInventoryProductGroup], int]:
        offset = (page - 1) * limit
        filtered = self._filtered_stmt(
            low_stock_only=low_stock_only,
            low_stock_threshold=low_stock_threshold,
            sku_query=sku_query,
        )
        subq = filtered.subquery("inventory_rows")

        grouped_stmt = (
            select(
                subq.c.product_id,
                subq.c.product_name,
                subq.c.sync_source,
                func.sum(subq.c.quantity_on_hand).label("total_on_hand"),
                func.sum(subq.c.quantity_reserved).label("total_reserved"),
                func.sum(subq.c.available).label("total_available"),
                func.count().label("variant_count"),
            )
            .group_by(subq.c.product_id, subq.c.product_name, subq.c.sync_source)
            .order_by(subq.c.product_name)
        )

        total = int((await self._session.scalar(select(func.count()).select_from(grouped_stmt.subquery()))) or 0)
        grouped_rows = (
            await self._session.execute(grouped_stmt.offset(offset).limit(limit))
        ).all()

        if not grouped_rows:
            return [], total

        product_ids = [row.product_id for row in grouped_rows]
        variant_rows = (
            await self._session.execute(
                filtered.where(ProductVariantModel.product_id.in_(product_ids)).order_by(
                    ProductVariantModel.sku
                )
            )
        ).all()

        variants_by_product: dict[UUID, list[AdminInventoryRow]] = {}
        for row in variant_rows:
            item = self._row_from_result(row, low_stock_threshold=low_stock_threshold)
            variants_by_product.setdefault(item.product_id, []).append(item)

        groups = [
            AdminInventoryProductGroup(
                product_id=row.product_id,
                product_name=row.product_name,
                sync_source=row.sync_source,
                total_on_hand=int(row.total_on_hand),
                total_reserved=int(row.total_reserved),
                total_available=int(row.total_available),
                is_low_stock=int(row.total_available) <= low_stock_threshold,
                variant_count=int(row.variant_count),
                variants=tuple(variants_by_product.get(row.product_id, [])),
            )
            for row in grouped_rows
        ]
        return groups, total

    async def get_inventory_overview(self, *, low_stock_threshold: int) -> AdminInventoryOverview:
        subq = self._base_stmt().subquery("inventory_overview")

        total_variants = int(
            (await self._session.scalar(select(func.count()).select_from(subq))) or 0
        )
        total_products = int(
            (
                await self._session.scalar(
                    select(func.count(func.distinct(subq.c.product_id))).select_from(subq)
                )
            )
            or 0
        )
        low_stock_variants = int(
            (
                await self._session.scalar(
                    select(func.count())
                    .select_from(subq)
                    .where(subq.c.available <= low_stock_threshold)
                )
            )
            or 0
        )
        low_stock_products = int(
            (
                await self._session.scalar(
                    select(func.count(func.distinct(subq.c.product_id)))
                    .select_from(subq)
                    .where(subq.c.available <= low_stock_threshold)
                )
            )
            or 0
        )
        out_of_stock_variants = int(
            (
                await self._session.scalar(
                    select(func.count()).select_from(subq).where(subq.c.available <= 0)
                )
            )
            or 0
        )
        out_of_stock_products = int(
            (
                await self._session.scalar(
                    select(func.count(func.distinct(subq.c.product_id)))
                    .select_from(subq)
                    .where(subq.c.available <= 0)
                )
            )
            or 0
        )

        return AdminInventoryOverview(
            total_variants=total_variants,
            total_products=total_products,
            low_stock_variants=low_stock_variants,
            low_stock_products=low_stock_products,
            out_of_stock_variants=out_of_stock_variants,
            out_of_stock_products=out_of_stock_products,
            low_stock_threshold=low_stock_threshold,
        )

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

        item, product_id, sku, product_name, sync_source, available_qty = row
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
            product_id=product_id,
            sku=sku,
            product_name=product_name,
            sync_source=sync_source,
            quantity_on_hand=item.quantity_on_hand,
            quantity_reserved=item.quantity_reserved,
            available=new_available,
            version=item.version,
            is_low_stock=new_available <= low_stock_threshold,
        )
