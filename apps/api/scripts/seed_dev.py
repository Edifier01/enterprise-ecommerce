"""Development seed script — populates the database with sample data.

Usage:
    cd apps/api
    python -m scripts.seed_dev

Safe to run multiple times — skips seeding if products already exist.
Seeds categories, products (with primary category + optional sale price), and
one default variant per product (per ADR-002 consistency rule).
"""

import asyncio
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.features.catalog.infrastructure.persistence.models import (
    CategoryModel,
    ProductModel,
    ProductVariantModel,
)

# --- categories ------------------------------------------------------------
_CATEGORIES = [
    {"slug": "elektronika", "name": "Электроника", "description": "Гаджеты и техника", "sort_order": 0},
    {"slug": "odezhda", "name": "Одежда", "description": "Повседневная и сезонная одежда", "sort_order": 1},
    {"slug": "aksessuary", "name": "Аксессуары", "description": "Сумки, ремни и мелочи", "sort_order": 2},
]

# --- products: (data, category_slug, variants) -----------------------------
_SAMPLE_PRODUCTS = [
    {
        "name": "Classic White T-Shirt",
        "slug": "classic-white-t-shirt",
        "price_cents": 2999,
        "compare_at_price_cents": 3999,
        "currency": "USD",
        "in_stock": True,
        "category": "odezhda",
        "variants": [
            {"sku": "TSHIRT-WHT-S", "name": "Размер S", "attributes": {"size": "S"}, "price_cents": 2999, "is_default": True, "sort_order": 0},
            {"sku": "TSHIRT-WHT-M", "name": "Размер M", "attributes": {"size": "M"}, "price_cents": 2999, "is_default": False, "sort_order": 1},
            {"sku": "TSHIRT-WHT-L", "name": "Размер L", "attributes": {"size": "L"}, "price_cents": 3299, "is_default": False, "sort_order": 2},
        ],
    },
    {
        "name": "Slim Fit Jeans",
        "slug": "slim-fit-jeans",
        "price_cents": 7999,
        "currency": "USD",
        "in_stock": True,
        "category": "odezhda",
        "variants": [
            {"sku": "JEANS-SLIM-32", "name": "W32", "attributes": {"waist": "32"}, "price_cents": 7999, "is_default": True, "sort_order": 0},
            {"sku": "JEANS-SLIM-34", "name": "W34", "attributes": {"waist": "34"}, "price_cents": 7999, "is_default": False, "sort_order": 1},
        ],
    },
    {
        "name": "Running Sneakers",
        "slug": "running-sneakers",
        "price_cents": 12999,
        "compare_at_price_cents": 15999,
        "currency": "USD",
        "in_stock": True,
        "category": "odezhda",
        "variants": [
            {"sku": "SNKR-RUN-42", "name": "EU 42", "attributes": {"size": "42"}, "price_cents": 12999, "is_default": True, "sort_order": 0},
            {"sku": "SNKR-RUN-43", "name": "EU 43", "attributes": {"size": "43"}, "price_cents": 12999, "is_default": False, "sort_order": 1},
        ],
    },
    {
        "name": "Wool Blazer",
        "slug": "wool-blazer",
        "price_cents": 24999,
        "currency": "USD",
        "in_stock": False,
        "category": "odezhda",
        "variants": [
            {"sku": "BLAZER-WOOL-M", "name": "Размер M", "attributes": {"size": "M"}, "price_cents": 24999, "is_default": True, "sort_order": 0},
        ],
    },
    {
        "name": "Canvas Tote Bag",
        "slug": "canvas-tote-bag",
        "price_cents": 3999,
        "currency": "USD",
        "in_stock": True,
        "category": "aksessuary",
        "variants": [
            {"sku": "TOTE-CANVAS", "name": "Стандарт", "attributes": {}, "price_cents": 3999, "is_default": True, "sort_order": 0},
        ],
    },
    {
        "name": "Leather Belt",
        "slug": "leather-belt",
        "price_cents": 4999,
        "currency": "USD",
        "in_stock": True,
        "category": "aksessuary",
        "variants": [
            {"sku": "BELT-LTHR-90", "name": "90 см", "attributes": {"length": "90"}, "price_cents": 4999, "is_default": True, "sort_order": 0},
            {"sku": "BELT-LTHR-100", "name": "100 см", "attributes": {"length": "100"}, "price_cents": 4999, "is_default": False, "sort_order": 1},
        ],
    },
    {
        "name": "Merino Wool Sweater",
        "slug": "merino-wool-sweater",
        "price_cents": 15999,
        "compare_at_price_cents": 19999,
        "currency": "USD",
        "in_stock": True,
        "category": "odezhda",
        "variants": [
            {"sku": "SWTR-MRN-M", "name": "Размер M", "attributes": {"size": "M"}, "price_cents": 15999, "is_default": True, "sort_order": 0},
        ],
    },
    {
        "name": "Wireless Earbuds",
        "slug": "wireless-earbuds",
        "price_cents": 8999,
        "compare_at_price_cents": 10999,
        "currency": "USD",
        "in_stock": True,
        "category": "elektronika",
        "variants": [
            {"sku": "EARBUDS-BLK", "name": "Чёрный", "attributes": {"color": "black"}, "price_cents": 8999, "is_default": True, "sort_order": 0},
            {"sku": "EARBUDS-WHT", "name": "Белый", "attributes": {"color": "white"}, "price_cents": 8999, "is_default": False, "sort_order": 1},
        ],
    },
]


async def seed() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        count = await session.scalar(select(func.count()).select_from(ProductModel))
        if count and count > 0:
            print(f"Database already has {count} product(s). Skipping seed.")
            await engine.dispose()
            return

        category_ids: dict[str, uuid.UUID] = {}
        for data in _CATEGORIES:
            cat_id = uuid.uuid4()
            category_ids[data["slug"]] = cat_id
            session.add(CategoryModel(id=cat_id, is_active=True, **data))

        for data in _SAMPLE_PRODUCTS:
            payload = dict(data)
            category_slug = payload.pop("category")
            variants = payload.pop("variants")
            product_id = uuid.uuid4()
            session.add(
                ProductModel(
                    id=product_id,
                    category_id=category_ids.get(category_slug),
                    **payload,
                )
            )
            for variant in variants:
                session.add(
                    ProductVariantModel(
                        id=uuid.uuid4(),
                        product_id=product_id,
                        in_stock=data["in_stock"],
                        **variant,
                    )
                )

        await session.commit()

    await engine.dispose()
    print(
        f"Seeded {len(_CATEGORIES)} categories and {len(_SAMPLE_PRODUCTS)} products "
        "with variants successfully."
    )


if __name__ == "__main__":
    asyncio.run(seed())
