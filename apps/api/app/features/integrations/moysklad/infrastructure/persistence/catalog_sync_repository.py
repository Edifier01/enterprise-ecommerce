"""Persist MoySklad catalog snapshots into local DB."""

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.catalog.infrastructure.inventory_ports_adapter import StorefrontAvailabilityAdapter
from app.features.catalog.infrastructure.persistence.models import (
    ProductModel,
    ProductVariantModel,
)
from app.features.integrations.moysklad.application.slug import unique_slug
from app.features.integrations.moysklad.domain.ports import MoySkladProduct, MoySkladVariant
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel

logger = logging.getLogger(__name__)


class CatalogSyncRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_product_by_ms_id(self, ms_product_id: str) -> ProductModel | None:
        stmt = select(ProductModel).where(ProductModel.moysklad_product_id == ms_product_id)
        return (await self._session.scalars(stmt)).first()

    async def get_variant_by_ms_id(self, ms_variant_id: str) -> ProductVariantModel | None:
        stmt = select(ProductVariantModel).where(
            ProductVariantModel.moysklad_variant_id == ms_variant_id
        )
        return (await self._session.scalars(stmt)).first()

    async def upsert_product(
        self,
        ms_product: MoySkladProduct,
        *,
        has_variants: bool,
    ) -> tuple[ProductModel, bool]:
        now = datetime.now(tz=UTC)
        existing = await self.get_product_by_ms_id(ms_product.external_id)

        if existing is None:
            slug = await unique_slug(
                ms_product.name,
                lambda candidate: self._slug_exists(candidate),
            )
            product = ProductModel(
                id=uuid.uuid4(),
                name=ms_product.name,
                slug=slug,
                price_cents=ms_product.retail_price_cents,
                currency="RUB",
                in_stock=False,
                status="archived" if ms_product.archived else "draft",
                sync_source="moysklad",
                moysklad_product_id=ms_product.external_id,
                erp_name=ms_product.name,
                erp_image_url=ms_product.image_url,
                last_synced_at=now,
            )
            self._session.add(product)
            await self._session.flush()
            return product, True

        # Category is assigned manually in admin — never overwritten by sync.
        existing.erp_name = ms_product.name
        existing.last_synced_at = now
        if ms_product.archived:
            existing.status = "archived"
        if not has_variants:
            existing.price_cents = ms_product.retail_price_cents
        if existing.erp_image_url is None and ms_product.image_url:
            existing.erp_image_url = ms_product.image_url
        await self._session.flush()
        return existing, False

    async def upsert_variant(
        self,
        product: ProductModel,
        ms_variant: MoySkladVariant,
        *,
        is_default: bool,
        sort_order: int,
    ) -> tuple[ProductVariantModel, bool]:
        existing = await self.get_variant_by_ms_id(ms_variant.external_id)
        in_stock = not ms_variant.archived

        if existing is None:
            sku = await self._unique_sku(ms_variant.sku)
            variant = ProductVariantModel(
                id=uuid.uuid4(),
                product_id=product.id,
                sku=sku,
                name=ms_variant.name,
                attributes=ms_variant.attributes,
                price_cents=ms_variant.retail_price_cents,
                wholesale_price_cents=ms_variant.wholesale_price_cents,
                in_stock=in_stock,
                is_default=is_default,
                sort_order=sort_order,
                moysklad_variant_id=ms_variant.external_id,
                barcode=ms_variant.barcode,
                weight_grams=ms_variant.weight_grams,
                dimensions_cm=ms_variant.dimensions_cm,
            )
            self._session.add(variant)
            await self._session.flush()
            await self._ensure_inventory_item(variant.id, quantity=0)
            return variant, True

        existing.name = ms_variant.name
        existing.price_cents = ms_variant.retail_price_cents
        existing.wholesale_price_cents = ms_variant.wholesale_price_cents
        existing.attributes = ms_variant.attributes
        existing.barcode = ms_variant.barcode
        existing.weight_grams = ms_variant.weight_grams
        existing.dimensions_cm = ms_variant.dimensions_cm
        existing.in_stock = in_stock
        existing.is_default = is_default
        existing.sort_order = sort_order
        await self._session.flush()
        return existing, False

    async def upsert_default_variant_from_product(
        self,
        product: ProductModel,
        ms_product: MoySkladProduct,
    ) -> tuple[ProductVariantModel, bool]:
        pseudo = MoySkladVariant(
            external_id=f"product:{ms_product.external_id}",
            product_external_id=ms_product.external_id,
            name=ms_product.name,
            sku=ms_product.code or ms_product.name,
            archived=ms_product.archived,
            attributes={},
            retail_price_cents=ms_product.retail_price_cents,
            wholesale_price_cents=ms_product.wholesale_price_cents,
            barcode=ms_product.barcode,
            weight_grams=ms_product.weight_grams,
            dimensions_cm=None,
        )
        existing = (
            await self._session.scalars(
                select(ProductVariantModel).where(
                    ProductVariantModel.product_id == product.id,
                    ProductVariantModel.is_default.is_(True),
                )
            )
        ).first()

        if existing is not None and existing.moysklad_variant_id is None:
            existing.moysklad_variant_id = pseudo.external_id

        if existing is not None and existing.moysklad_variant_id == pseudo.external_id:
            ms_variant = pseudo
            existing.name = ms_variant.name
            existing.price_cents = ms_variant.retail_price_cents
            existing.wholesale_price_cents = ms_variant.wholesale_price_cents
            existing.barcode = ms_variant.barcode
            existing.weight_grams = ms_variant.weight_grams
            existing.in_stock = not ms_variant.archived
            await self._session.flush()
            return existing, False

        return await self.upsert_variant(product, pseudo, is_default=True, sort_order=0)

    async def apply_stock(self, variant: ProductVariantModel, quantity: int) -> None:
        item = await self._session.scalar(
            select(InventoryItemModel)
            .where(InventoryItemModel.variant_id == variant.id)
            .with_for_update()
        )
        ms_stock = max(quantity, 0)
        if item is None:
            await self._ensure_inventory_item(variant.id, quantity=ms_stock)
            return

        previous_on_hand = item.quantity_on_hand
        item.quantity_on_hand = ms_stock
        item.version += 1

        # ADR-015: when ERP physical balance drops, release matching awaiting.
        # Until per-position shipped qty exists, stock drop is the durable signal
        # that warehouse consumed units (demand). Unrelated write-offs may settle
        # early — sellable stays non-inflating because on_hand also dropped.
        if ms_stock < previous_on_hand and item.quantity_awaiting_fulfillment > 0:
            drop = previous_on_hand - ms_stock
            settled = min(drop, item.quantity_awaiting_fulfillment)
            item.quantity_awaiting_fulfillment -= settled

        commitments = item.quantity_reserved + item.quantity_awaiting_fulfillment
        if commitments > item.quantity_on_hand:
            logger.warning(
                "inventory_erp_below_site_commitments",
                extra={
                    "variant_id": str(variant.id),
                    "ms_stock": ms_stock,
                    "reserved": item.quantity_reserved,
                    "awaiting": item.quantity_awaiting_fulfillment,
                },
            )

        available = max(item.quantity_on_hand - commitments, 0)
        availability = StorefrontAvailabilityAdapter(self._session)
        await availability.apply_availability(variant.id, available)
        await self._session.flush()

    async def _ensure_inventory_item(self, variant_id: uuid.UUID, *, quantity: int) -> None:
        ms_stock = max(quantity, 0)
        self._session.add(
            InventoryItemModel(
                id=uuid.uuid4(),
                variant_id=variant_id,
                quantity_on_hand=ms_stock,
                quantity_reserved=0,
                quantity_awaiting_fulfillment=0,
                version=0,
            )
        )
        availability = StorefrontAvailabilityAdapter(self._session)
        await availability.apply_availability(variant_id, ms_stock)
        await self._session.flush()

    async def _slug_exists(self, slug: str) -> bool:
        stmt = select(ProductModel.id).where(ProductModel.slug == slug)
        return (await self._session.scalar(stmt)) is not None

    async def _unique_sku(self, sku: str) -> str:
        normalized = sku.strip()[:64]
        if not normalized:
            normalized = f"MS-{uuid.uuid4().hex[:8]}"
        stmt = select(ProductVariantModel.id).where(ProductVariantModel.sku == normalized)
        if (await self._session.scalar(stmt)) is None:
            return normalized
        return f"{normalized[:58]}-{uuid.uuid4().hex[:5]}"
