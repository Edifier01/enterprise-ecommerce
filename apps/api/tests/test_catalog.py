"""Catalog API tests with in-memory SQLite."""

import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.catalog.infrastructure.persistence.models import ProductModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

def _make_products() -> list[ProductModel]:
    return [
        ProductModel(
            id=uuid.uuid4(),
            name="Test Product",
            slug="test-product",
            price_cents=1999,
            currency="USD",
            in_stock=True,
        ),
        ProductModel(
            id=uuid.uuid4(),
            name="Out of Stock",
            slug="out-of-stock",
            price_cents=999,
            currency="USD",
            in_stock=False,
        ),
    ]


@pytest.fixture
async def catalog_client() -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        session.add_all(_make_products())
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
async def test_list_products_returns_paginated_list(catalog_client: AsyncClient) -> None:
    response = await catalog_client.get("/api/v1/products")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["items"][0]["name"] == "Test Product"
    assert data["items"][0]["price_cents"] == 1999


@pytest.mark.asyncio
async def test_list_products_respects_pagination(catalog_client: AsyncClient) -> None:
    response = await catalog_client.get("/api/v1/products?page=1&limit=1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 1
    assert data["limit"] == 1


@pytest.mark.asyncio
async def test_list_products_empty_db(client: AsyncClient) -> None:
    """Catalog returns empty list when no products exist."""
    response = await client.get("/api/v1/products")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_products_invalid_page_coerced(catalog_client: AsyncClient) -> None:
    """page=0 is rejected by Query(ge=1) — returns 422."""
    response = await catalog_client.get("/api/v1/products?page=0")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_products_limit_exceeds_max_rejected(catalog_client: AsyncClient) -> None:
    """limit=101 exceeds Query(le=100) — returns 422."""
    response = await catalog_client.get("/api/v1/products?limit=101")
    assert response.status_code == 422
