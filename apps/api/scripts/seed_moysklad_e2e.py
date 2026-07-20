"""Seed a MoySklad-synced product for Playwright E2E smoke tests.

Usage:
    cd apps/api
    python -m scripts.seed_moysklad_e2e

Safe to run multiple times — upserts by slug.
"""

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.features.catalog.infrastructure.persistence.models import (
    CategoryModel,
    ProductModel,
    ProductVariantModel,
)
from app.features.integrations.moysklad.infrastructure.persistence.models import ProductImageModel
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel

_E2E_SLUG = "e2e-moysklad-synced-product"
_E2E_MULTICOLOR_SLUG = "e2e-moysklad-multicolor-jacket"
_E2E_SKU = "E2E-MS-SKU-001"
_E2E_SKU_MULTICAM = "E2E-MS-MULTICAM-M"
_E2E_SKU_COYOTE = "E2E-MS-COYOTE-M"
_MS_PRODUCT_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
_MS_VARIANT_ID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff"
_MS_MULTICOLOR_PRODUCT_ID = "cccccccc-dddd-4eee-8fff-000000000001"


async def seed_moysklad_e2e_product(session: AsyncSession) -> None:
    category_id = await session.scalar(
        select(CategoryModel.id).where(CategoryModel.slug == "odezhda").limit(1)
    )

    existing = await session.scalar(select(ProductModel).where(ProductModel.slug == _E2E_SLUG))
    if existing is None:
        product_id = uuid.uuid4()
        session.add(
            ProductModel(
                id=product_id,
                name="E2E MoySklad Synced Jacket",
                slug=_E2E_SLUG,
                price_cents=12999,
                currency="RUB",
                in_stock=True,
                status="active",
                category_id=category_id,
                description="E2E fixture — synced from MoySklad.",
                sync_source="moysklad",
                moysklad_product_id=_MS_PRODUCT_ID,
                erp_name="Куртка тактическая (MS)",
                erp_image_url="https://example.com/ms-placeholder.jpg",
            )
        )
    else:
        product_id = existing.id
        existing.sync_source = "moysklad"
        existing.moysklad_product_id = _MS_PRODUCT_ID
        existing.erp_name = "Куртка тактическая (MS)"
        existing.status = "active"

    variant = await session.scalar(
        select(ProductVariantModel).where(ProductVariantModel.sku == _E2E_SKU)
    )
    if variant is None:
        variant_id = uuid.uuid4()
        session.add(
            ProductVariantModel(
                id=variant_id,
                product_id=product_id,
                sku=_E2E_SKU,
                name="Размер M",
                attributes={"size": "M"},
                price_cents=12999,
                wholesale_price_cents=9999,
                in_stock=True,
                is_default=True,
                sort_order=0,
                moysklad_variant_id=_MS_VARIANT_ID,
                barcode="4601234567890",
                weight_grams=850,
                dimensions_cm={"length": 30, "width": 25, "height": 5},
            )
        )
        await session.flush()
        session.add(
            InventoryItemModel(
                variant_id=variant_id,
                quantity_on_hand=25,
                quantity_reserved=0,
                version=0,
            )
        )
    else:
        variant.product_id = product_id
        variant.moysklad_variant_id = _MS_VARIANT_ID
        variant.barcode = "4601234567890"
        variant.weight_grams = 850
        variant.dimensions_cm = {"length": 30, "width": 25, "height": 5}

    await session.commit()
    print(f"Seeded MoySklad E2E product: {_E2E_SLUG}")


async def seed_moysklad_e2e_multicolor_product(session: AsyncSession) -> None:
    category_id = await session.scalar(
        select(CategoryModel.id).where(CategoryModel.slug == "odezhda").limit(1)
    )

    existing = await session.scalar(
        select(ProductModel).where(ProductModel.slug == _E2E_MULTICOLOR_SLUG)
    )
    if existing is None:
        product_id = uuid.uuid4()
        session.add(
            ProductModel(
                id=product_id,
                name="E2E Multicolor Jacket",
                slug=_E2E_MULTICOLOR_SLUG,
                price_cents=14999,
                currency="RUB",
                in_stock=True,
                status="active",
                category_id=category_id,
                description="E2E multicolor fixture.",
                sync_source="moysklad",
                moysklad_product_id=_MS_MULTICOLOR_PRODUCT_ID,
                erp_name="Куртка мультицвет (MS)",
                erp_image_url="https://example.com/ms-multicolor-placeholder.jpg",
            )
        )
    else:
        product_id = existing.id
        existing.category_id = category_id
        existing.status = "active"
        existing.erp_image_url = "https://example.com/ms-multicolor-placeholder.jpg"

    for sku, color, is_default, sort_order in (
        (_E2E_SKU_MULTICAM, "Multicam", True, 0),
        (_E2E_SKU_COYOTE, "Coyote", False, 1),
    ):
        variant = await session.scalar(
            select(ProductVariantModel).where(ProductVariantModel.sku == sku)
        )
        if variant is None:
            variant_id = uuid.uuid4()
            session.add(
                ProductVariantModel(
                    id=variant_id,
                    product_id=product_id,
                    sku=sku,
                    name=f"{color} M",
                    attributes={"color": color, "size": "M"},
                    price_cents=14999,
                    wholesale_price_cents=11999,
                    in_stock=True,
                    is_default=is_default,
                    sort_order=sort_order,
                )
            )
            await session.flush()
            session.add(
                InventoryItemModel(
                    variant_id=variant_id,
                    quantity_on_hand=10,
                    quantity_reserved=0,
                    version=0,
                )
            )
        else:
            variant.product_id = product_id
            variant.attributes = {"color": color, "size": "M"}

    existing_image = await session.scalar(
        select(ProductImageModel).where(
            ProductImageModel.product_id == product_id,
            ProductImageModel.option_color == "Multicam",
        )
    )
    if existing_image is None:
        session.add(
            ProductImageModel(
                product_id=product_id,
                url="https://example.com/ms-multicolor-multicam.jpg",
                sort_order=0,
                option_color="Multicam",
            )
        )

    await session.commit()
    print(f"Seeded MoySklad E2E multicolor product: {_E2E_MULTICOLOR_SLUG}")


async def seed() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        await seed_moysklad_e2e_product(session)
        await seed_moysklad_e2e_multicolor_product(session)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
