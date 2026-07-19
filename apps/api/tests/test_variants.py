"""Product variants, sale pricing, and category-filter tests (Sprint 8, ADR-002).

Covers the catalog additions from ADR-002:
- variants exposed on the product detail path, ordered by sort_order
- compare-at (sale) price display field on the product
- primary-category association filtering on the list endpoint
- the ``compare_at_price_cents > price_cents`` domain invariant
"""

import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.catalog.domain.entities import Product
from app.features.catalog.infrastructure.persistence.models import (
    CategoryModel,
    ProductModel,
    ProductVariantModel,
)
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Stable identifiers so tests can reference seeded rows directly.
_CLOTHING_ID = uuid.uuid4()
_ELECTRONICS_ID = uuid.uuid4()
_TSHIRT_ID = uuid.uuid4()
_JEANS_ID = uuid.uuid4()
_EARBUDS_ID = uuid.uuid4()


def _make_categories() -> list[CategoryModel]:
    return [
        CategoryModel(
            id=_CLOTHING_ID,
            slug="odezhda",
            name="Одежда",
            description="Повседневная одежда",
            parent_id=None,
            is_active=True,
            sort_order=0,
        ),
        CategoryModel(
            id=_ELECTRONICS_ID,
            slug="elektronika",
            name="Электроника",
            description="Гаджеты и техника",
            parent_id=None,
            is_active=True,
            sort_order=1,
        ),
    ]


def _make_products() -> list[ProductModel]:
    return [
        # On-sale product with multiple variants (intentionally out of order).
        ProductModel(
            id=_TSHIRT_ID,
            name="Classic White T-Shirt",
            slug="classic-white-t-shirt",
            price_cents=2999,
            compare_at_price_cents=3999,
            currency="USD",
            in_stock=True,
            category_id=_CLOTHING_ID,
        ),
        # Regularly-priced product with a single variant.
        ProductModel(
            id=_JEANS_ID,
            name="Slim Fit Jeans",
            slug="slim-fit-jeans",
            price_cents=7999,
            compare_at_price_cents=None,
            currency="USD",
            in_stock=True,
            category_id=_CLOTHING_ID,
        ),
        # Product in a different category, no variants.
        ProductModel(
            id=_EARBUDS_ID,
            name="Wireless Earbuds",
            slug="wireless-earbuds",
            price_cents=8999,
            compare_at_price_cents=None,
            currency="USD",
            in_stock=True,
            category_id=_ELECTRONICS_ID,
        ),
    ]


def _make_variants() -> list[ProductVariantModel]:
    return [
        ProductVariantModel(
            id=uuid.uuid4(),
            product_id=_TSHIRT_ID,
            sku="TSHIRT-WHT-L",
            name="Размер L",
            attributes={"size": "L"},
            price_cents=3199,
            in_stock=True,
            is_default=False,
            sort_order=2,
        ),
        ProductVariantModel(
            id=uuid.uuid4(),
            product_id=_TSHIRT_ID,
            sku="TSHIRT-WHT-M",
            name="Размер M",
            attributes={"size": "M"},
            price_cents=2999,
            in_stock=True,
            is_default=False,
            sort_order=1,
        ),
        ProductVariantModel(
            id=uuid.uuid4(),
            product_id=_TSHIRT_ID,
            sku="TSHIRT-WHT-S",
            name="Размер S",
            attributes={"size": "S"},
            price_cents=2999,
            in_stock=True,
            is_default=True,
            sort_order=0,
        ),
        ProductVariantModel(
            id=uuid.uuid4(),
            product_id=_JEANS_ID,
            sku="JEANS-SLIM-32",
            name="W32",
            attributes={"waist": "32"},
            price_cents=7999,
            in_stock=True,
            is_default=True,
            sort_order=0,
        ),
    ]


@pytest.fixture
async def catalog_client() -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        session.add_all(_make_categories())
        session.add_all(_make_products())
        session.add_all(_make_variants())
        await session.commit()

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


# --- variants on the product detail path -----------------------------------


@pytest.mark.asyncio
async def test_product_detail_includes_variants_ordered(catalog_client: AsyncClient) -> None:
    """Variants are returned on detail and ordered by sort_order."""
    response = await catalog_client.get("/api/v1/products/classic-white-t-shirt")
    assert response.status_code == 200
    variants = response.json()["variants"]
    assert len(variants) == 3
    assert [v["sort_order"] for v in variants] == [0, 1, 2]
    assert variants[0]["sku"] == "TSHIRT-WHT-S"
    assert variants[0]["is_default"] is True


@pytest.mark.asyncio
async def test_product_variant_attributes_shape(catalog_client: AsyncClient) -> None:
    """Variant attributes round-trip as a string→string map."""
    response = await catalog_client.get("/api/v1/products/classic-white-t-shirt")
    assert response.status_code == 200
    default = next(v for v in response.json()["variants"] if v["is_default"])
    assert default["attributes"] == {"size": "S"}


@pytest.mark.asyncio
async def test_list_products_includes_variants(catalog_client: AsyncClient) -> None:
    """List path includes variants for wholesale-aware catalog cards (Sprint E)."""
    response = await catalog_client.get("/api/v1/products")
    assert response.status_code == 200
    tshirt = next(i for i in response.json()["items"] if i["slug"] == "classic-white-t-shirt")
    assert len(tshirt["variants"]) == 3
    earbuds = next(i for i in response.json()["items"] if i["slug"] == "wireless-earbuds")
    assert earbuds["variants"] == []


@pytest.mark.asyncio
async def test_product_detail_includes_option_groups(catalog_client: AsyncClient) -> None:
    response = await catalog_client.get("/api/v1/products/classic-white-t-shirt")
    assert response.status_code == 200
    data = response.json()
    assert data["option_groups"] == [{"key": "size", "label": "Размер", "values": ["S", "M", "L"]}]
    assert data["images"] == []


# --- sale (compare-at) pricing ---------------------------------------------


@pytest.mark.asyncio
async def test_product_detail_includes_compare_at_price(catalog_client: AsyncClient) -> None:
    """A discounted product exposes compare_at_price_cents above its price."""
    response = await catalog_client.get("/api/v1/products/classic-white-t-shirt")
    assert response.status_code == 200
    data = response.json()
    assert data["compare_at_price_cents"] == 3999
    assert data["compare_at_price_cents"] > data["price_cents"]


@pytest.mark.asyncio
async def test_product_detail_null_compare_at_when_no_sale(catalog_client: AsyncClient) -> None:
    """A non-discounted product returns compare_at_price_cents = null."""
    response = await catalog_client.get("/api/v1/products/slim-fit-jeans")
    assert response.status_code == 200
    assert response.json().get("compare_at_price_cents") is None


# --- primary-category filtering (ADR-002) ----------------------------------


@pytest.mark.asyncio
async def test_list_products_filter_by_category(catalog_client: AsyncClient) -> None:
    """The category slug filter returns only products in that primary category."""
    response = await catalog_client.get("/api/v1/products?category=odezhda")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    slugs = {item["slug"] for item in data["items"]}
    assert slugs == {"classic-white-t-shirt", "slim-fit-jeans"}


@pytest.mark.asyncio
async def test_list_products_filter_other_category(catalog_client: AsyncClient) -> None:
    response = await catalog_client.get("/api/v1/products?category=elektronika")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "wireless-earbuds"
    assert data["items"][0]["category_id"] is not None


@pytest.mark.asyncio
async def test_list_products_unknown_category_returns_empty(catalog_client: AsyncClient) -> None:
    response = await catalog_client.get("/api/v1/products?category=does-not-exist")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_products_without_filter_returns_all(catalog_client: AsyncClient) -> None:
    response = await catalog_client.get("/api/v1/products")
    assert response.status_code == 200
    assert response.json()["total"] == 3


# --- domain invariant ------------------------------------------------------


def test_product_rejects_compare_at_not_greater_than_price() -> None:
    """A 'was' price must be strictly greater than the current price."""
    with pytest.raises(ValueError):
        Product(
            id=uuid.uuid4(),
            name="Bad Sale",
            slug="bad-sale",
            price_cents=5000,
            currency="USD",
            in_stock=True,
            compare_at_price_cents=5000,
        )


def test_product_accepts_valid_compare_at() -> None:
    product = Product(
        id=uuid.uuid4(),
        name="Good Sale",
        slug="good-sale",
        price_cents=4000,
        currency="USD",
        in_stock=True,
        compare_at_price_cents=5000,
    )
    assert product.compare_at_price_cents == 5000
