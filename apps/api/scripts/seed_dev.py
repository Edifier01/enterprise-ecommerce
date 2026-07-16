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
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.features.admin.infrastructure.persistence.models import AdminUserModel
from app.features.auth.infrastructure.persistence.models import UserModel
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher
from app.features.catalog.infrastructure.persistence.models import (
    CategoryModel,
    ProductModel,
    ProductVariantModel,
)
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel

_DEFAULT_IN_STOCK_QUANTITY = 50
_WHOLESALER_EMAIL = "wholesaler@example.com"
_WHOLESALER_PASSWORD = "wholesale12345"

# --- categories (root + children) -----------------------------------------
_ROOT_CATEGORIES = [
    {"slug": "snaryazhenie", "name": "Снаряжение", "description": "Разгрузки, рюкзаки, подсумки", "sort_order": 0},
    {"slug": "odezhda", "name": "Тактическая одежда", "description": "Куртки, термобельё, мембрана", "sort_order": 1},
    {"slug": "obuv", "name": "Обувь", "description": "Ботинки, берцы, тактические кроссовки", "sort_order": 2},
    {"slug": "aksessuary", "name": "Аксессуары", "description": "Фонари, IFAK, ножи, оптика", "sort_order": 3},
]

_CHILD_CATEGORIES = [
    {"slug": "razgruzki", "name": "Разгрузки", "parent_slug": "snaryazhenie", "sort_order": 0},
    {"slug": "ryukzaki", "name": "Рюкзаки", "parent_slug": "snaryazhenie", "sort_order": 1},
    {"slug": "podsumki", "name": "Подсумки", "parent_slug": "snaryazhenie", "sort_order": 2},
    {"slug": "kurtki", "name": "Куртки", "parent_slug": "odezhda", "sort_order": 0},
    {"slug": "termo", "name": "Термобельё", "parent_slug": "odezhda", "sort_order": 1},
    {"slug": "botinki", "name": "Ботинки", "parent_slug": "obuv", "sort_order": 0},
    {"slug": "fonari", "name": "Фонари", "parent_slug": "aksessuary", "sort_order": 0},
]

_CURRENCY = "RUB"

# --- products: (data, category_slug, variants) -----------------------------
_SAMPLE_PRODUCTS = [
    {
        "name": "Classic White T-Shirt",
        "slug": "classic-white-t-shirt",
        "price_cents": 2999,
        "compare_at_price_cents": 3999,
        "currency": _CURRENCY,
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
        "currency": _CURRENCY,
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
        "currency": _CURRENCY,
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
        "currency": _CURRENCY,
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
        "currency": _CURRENCY,
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
        "currency": _CURRENCY,
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
        "currency": _CURRENCY,
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
        "currency": _CURRENCY,
        "in_stock": True,
        "category": "aksessuary",
        "variants": [
            {"sku": "EARBUDS-BLK", "name": "Чёрный", "attributes": {"color": "black"}, "price_cents": 8999, "is_default": True, "sort_order": 0},
            {"sku": "EARBUDS-WHT", "name": "Белый", "attributes": {"color": "white"}, "price_cents": 8999, "is_default": False, "sort_order": 1},
        ],
    },
]


async def _seed_admin_user(session: AsyncSession) -> None:
    hasher = BcryptPasswordHasher()
    password_hash = hasher.hash(settings.admin_dev_password)
    dev_emails = {settings.admin_dev_email, "admin@example.com"}

    for email in dev_emails:
        existing = await session.scalar(
            select(AdminUserModel).where(AdminUserModel.email == email)
        )
        if existing:
            existing.hashed_password = password_hash
            existing.is_active = True
            existing.role = "superadmin"
            print(f"Refreshed dev admin credentials: {email}")
            continue

        session.add(
            AdminUserModel(
                email=email,
                hashed_password=password_hash,
                role="superadmin",
                is_active=True,
            )
        )
        print(f"Seeded dev admin user: {email}")

    await session.commit()


async def _seed_wholesaler_user(session: AsyncSession) -> None:
    hasher = BcryptPasswordHasher()
    now = datetime.now(timezone.utc)
    password_hash = hasher.hash(_WHOLESALER_PASSWORD)
    existing = await session.scalar(
        select(UserModel).where(UserModel.email == _WHOLESALER_EMAIL)
    )
    if existing:
        existing.hashed_password = password_hash
        existing.is_active = True
        existing.is_wholesaler = True
        existing.email_verified_at = existing.email_verified_at or now
        await session.commit()
        print(f"Refreshed dev wholesaler credentials: {_WHOLESALER_EMAIL}")
        return

    session.add(
        UserModel(
            email=_WHOLESALER_EMAIL,
            hashed_password=password_hash,
            is_active=True,
            is_wholesaler=True,
            email_verified_at=now,
        )
    )
    await session.commit()
    print(f"Seeded dev wholesaler customer: {_WHOLESALER_EMAIL}")


async def seed() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        await _seed_admin_user(session)
        await _seed_wholesaler_user(session)

        count = await session.scalar(select(func.count()).select_from(ProductModel))
        if count and count > 0:
            print(f"Database already has {count} product(s). Skipping product seed.")
            await engine.dispose()
            return

        category_ids: dict[str, uuid.UUID] = {}
        for data in _ROOT_CATEGORIES:
            cat_id = uuid.uuid4()
            category_ids[data["slug"]] = cat_id
            session.add(CategoryModel(id=cat_id, is_active=True, **data))

        for data in _CHILD_CATEGORIES:
            parent_id = category_ids[data["parent_slug"]]
            payload = {k: v for k, v in data.items() if k != "parent_slug"}
            cat_id = uuid.uuid4()
            category_ids[data["slug"]] = cat_id
            session.add(
                CategoryModel(
                    id=cat_id,
                    parent_id=parent_id,
                    is_active=True,
                    description=None,
                    **payload,
                )
            )

        for data in _SAMPLE_PRODUCTS:
            payload = dict(data)
            category_slug = payload.pop("category")
            variants = payload.pop("variants")
            payload.setdefault("image_url", "/images/product-placeholder.svg")
            payload.setdefault(
                "description",
                f"{payload['name']} — экипировка собственного бренда для полевых условий и активного отдыха.",
            )
            product_id = uuid.uuid4()
            session.add(
                ProductModel(
                    id=product_id,
                    category_id=category_ids.get(category_slug),
                    **payload,
                )
            )
            for variant in variants:
                variant_id = uuid.uuid4()
                in_stock = data["in_stock"]
                wholesale_price_cents = (variant["price_cents"] * 80) // 100
                session.add(
                    ProductVariantModel(
                        id=variant_id,
                        product_id=product_id,
                        in_stock=in_stock,
                        wholesale_price_cents=wholesale_price_cents,
                        **variant,
                    )
                )
                await session.flush()
                session.add(
                    InventoryItemModel(
                        variant_id=variant_id,
                        quantity_on_hand=_DEFAULT_IN_STOCK_QUANTITY if in_stock else 0,
                        quantity_reserved=0,
                        version=0,
                    )
                )

        await session.commit()

    await engine.dispose()
    print(
        f"Seeded {len(_ROOT_CATEGORIES) + len(_CHILD_CATEGORIES)} categories and {len(_SAMPLE_PRODUCTS)} products "
        "with variants successfully."
    )


if __name__ == "__main__":
    asyncio.run(seed())
