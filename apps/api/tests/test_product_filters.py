"""Catalog product filter API tests."""

import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.catalog.infrastructure.persistence.models import (
    CategoryModel,
    ProductModel,
    ProductVariantModel,
)
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def filter_client() -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    category_id = uuid.uuid4()
    in_stock_product_id = uuid.uuid4()
    sale_product_id = uuid.uuid4()
    out_of_stock_product_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            CategoryModel(
                id=category_id,
                slug="odezhda",
                name="Тактическая одежда",
                description=None,
                parent_id=None,
                is_active=True,
                sort_order=0,
            )
        )
        session.add_all(
            [
                ProductModel(
                    id=in_stock_product_id,
                    name="Сухопут Softshell Jacket",
                    slug="sukholut-softshell",
                    price_cents=12000,
                    compare_at_price_cents=None,
                    currency="USD",
                    in_stock=True,
                    category_id=category_id,
                ),
                ProductModel(
                    id=sale_product_id,
                    name="Сухопут Multicam Pack",
                    slug="sukholut-multicam-pack",
                    price_cents=8000,
                    compare_at_price_cents=10000,
                    currency="USD",
                    in_stock=True,
                    category_id=category_id,
                ),
                ProductModel(
                    id=out_of_stock_product_id,
                    name="Сухопут Tactical Pants",
                    slug="sukholut-tactical-pants",
                    price_cents=9000,
                    compare_at_price_cents=None,
                    currency="USD",
                    in_stock=False,
                    category_id=category_id,
                ),
            ]
        )
        session.add_all(
            [
                ProductVariantModel(
                    id=uuid.uuid4(),
                    product_id=in_stock_product_id,
                    sku="SHT-S-M",
                    name="Размер M",
                    price_cents=12000,
                    in_stock=True,
                    is_default=True,
                    sort_order=0,
                    attributes={"size": "M", "color": "Olive"},
                ),
                ProductVariantModel(
                    id=uuid.uuid4(),
                    product_id=sale_product_id,
                    sku="SHT-MC",
                    name="Multicam",
                    price_cents=8000,
                    in_stock=True,
                    is_default=True,
                    sort_order=0,
                    attributes={"camouflage": "Multicam"},
                ),
                ProductVariantModel(
                    id=uuid.uuid4(),
                    product_id=out_of_stock_product_id,
                    sku="SHT-32",
                    name="W32",
                    price_cents=9000,
                    in_stock=False,
                    is_default=True,
                    sort_order=0,
                    attributes={"waist": "32"},
                ),
            ]
        )
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


@pytest.mark.asyncio
async def test_list_products_filter_in_stock(filter_client: AsyncClient) -> None:
    response = await filter_client.get(
        "/api/v1/products",
        params={"category": "odezhda", "in_stock": "true"},
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["items"]}
    assert slugs == {"sukholut-softshell", "sukholut-multicam-pack"}


@pytest.mark.asyncio
async def test_list_products_filter_on_sale(filter_client: AsyncClient) -> None:
    response = await filter_client.get(
        "/api/v1/products",
        params={"category": "odezhda", "on_sale": "true"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "sukholut-multicam-pack"


@pytest.mark.asyncio
async def test_list_products_filter_size(filter_client: AsyncClient) -> None:
    response = await filter_client.get(
        "/api/v1/products",
        params={"category": "odezhda", "size": "M"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["slug"] == "sukholut-softshell"


@pytest.mark.asyncio
async def test_list_products_filter_price_range(filter_client: AsyncClient) -> None:
    response = await filter_client.get(
        "/api/v1/products",
        params={"category": "odezhda", "price_min": 8500, "price_max": 9500},
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["items"]}
    assert slugs == {"sukholut-tactical-pants"}


@pytest.mark.asyncio
async def test_list_products_sort_price_asc(filter_client: AsyncClient) -> None:
    response = await filter_client.get(
        "/api/v1/products",
        params={"category": "odezhda", "sort": "price_asc"},
    )
    assert response.status_code == 200
    prices = [item["price_cents"] for item in response.json()["items"]]
    assert prices == sorted(prices)


@pytest.mark.asyncio
async def test_get_product_facets(filter_client: AsyncClient) -> None:
    response = await filter_client.get(
        "/api/v1/products/facets",
        params={"category": "odezhda"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "M" in data["sizes"]
    assert "Multicam" in data["colors"] or "Olive" in data["colors"]
    assert "brands" not in data
    assert data["price_min_cents"] <= data["price_max_cents"]


@pytest.mark.asyncio
async def test_search_with_in_stock_filter(filter_client: AsyncClient) -> None:
    response = await filter_client.get(
        "/api/v1/products/search",
        params={"q": "sukholut", "in_stock": "true"},
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["items"]}
    assert "sukholut-tactical-pants" not in slugs


@pytest.mark.asyncio
async def test_search_facets_scoped_to_query(filter_client: AsyncClient) -> None:
    response = await filter_client.get(
        "/api/v1/products/facets",
        params={"q": "softshell"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "M" in data["sizes"]
