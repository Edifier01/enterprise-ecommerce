"""Product search API tests."""

import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

_TSHIRT_ID = uuid.uuid4()
_EARBUDS_ID = uuid.uuid4()


def _make_products() -> list[ProductModel]:
    return [
        ProductModel(
            id=_TSHIRT_ID,
            name="Classic White T-Shirt",
            slug="classic-white-t-shirt",
            price_cents=2999,
            compare_at_price_cents=3999,
            currency="USD",
            in_stock=True,
            category_id=None,
        ),
        ProductModel(
            id=_EARBUDS_ID,
            name="Wireless Earbuds Pro",
            slug="wireless-earbuds-pro",
            price_cents=12999,
            compare_at_price_cents=None,
            currency="USD",
            in_stock=True,
            category_id=None,
        ),
    ]


def _make_variants() -> list[ProductVariantModel]:
    return [
        ProductVariantModel(
            id=uuid.uuid4(),
            product_id=_TSHIRT_ID,
            sku="TSHIRT-WHT-M",
            name="White / M",
            attributes={"color": "white", "size": "M"},
            price_cents=2999,
            in_stock=True,
            is_default=True,
            sort_order=0,
        ),
        ProductVariantModel(
            id=uuid.uuid4(),
            product_id=_EARBUDS_ID,
            sku="EARBUDS-BLK-01",
            name="Black",
            attributes={"color": "black"},
            price_cents=12999,
            in_stock=True,
            is_default=True,
            sort_order=0,
        ),
    ]


@pytest.fixture
async def search_client() -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
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


@pytest.mark.asyncio
async def test_search_by_product_name(search_client: AsyncClient) -> None:
    response = await search_client.get("/api/v1/products/search", params={"q": "t-shirt"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "classic-white-t-shirt"


@pytest.mark.asyncio
async def test_search_by_variant_sku(search_client: AsyncClient) -> None:
    response = await search_client.get("/api/v1/products/search", params={"q": "EARBUDS-BLK"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "wireless-earbuds-pro"


@pytest.mark.asyncio
async def test_search_case_insensitive(search_client: AsyncClient) -> None:
    response = await search_client.get("/api/v1/products/search", params={"q": "wireless"})
    assert response.status_code == 200
    assert response.json()["total"] == 1


@pytest.mark.asyncio
async def test_search_no_results(search_client: AsyncClient) -> None:
    response = await search_client.get("/api/v1/products/search", params={"q": "nonexistent-item"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_search_empty_query_returns_422(search_client: AsyncClient) -> None:
    response = await search_client.get("/api/v1/products/search", params={"q": ""})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_pagination(search_client: AsyncClient) -> None:
    response = await search_client.get(
        "/api/v1/products/search",
        params={"q": "classic", "page": 1, "limit": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["page"] == 1
    assert data["limit"] == 1
