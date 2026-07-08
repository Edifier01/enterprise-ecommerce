"""Category API tests with in-memory SQLite."""

import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.catalog.infrastructure.persistence.models import CategoryModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


def _make_categories() -> tuple[uuid.UUID, list[CategoryModel]]:
    parent_id = uuid.uuid4()
    child_id = uuid.uuid4()
    return parent_id, [
        CategoryModel(
            id=parent_id,
            slug="elektronika",
            name="Электроника",
            description="Гаджеты и техника",
            parent_id=None,
            is_active=True,
            sort_order=0,
        ),
        CategoryModel(
            id=child_id,
            slug="smartfony",
            name="Смартфоны",
            description="Мобильные телефоны",
            parent_id=parent_id,
            is_active=True,
            sort_order=1,
        ),
        CategoryModel(
            id=uuid.uuid4(),
            slug="inactive-cat",
            name="Неактивная",
            description=None,
            parent_id=None,
            is_active=False,
            sort_order=99,
        ),
    ]


@pytest.fixture
async def categories_client() -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    _, cats = _make_categories()
    async with session_factory() as session:
        session.add_all(cats)
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
async def test_list_categories_returns_active_only(categories_client: AsyncClient) -> None:
    response = await categories_client.get("/api/v1/categories")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    slugs = {item["slug"] for item in data["items"]}
    assert "elektronika" in slugs
    assert "smartfony" in slugs
    assert "inactive-cat" not in slugs


@pytest.mark.asyncio
async def test_list_categories_shape(categories_client: AsyncClient) -> None:
    response = await categories_client.get("/api/v1/categories")
    assert response.status_code == 200
    item = next(i for i in response.json()["items"] if i["slug"] == "elektronika")
    assert item["name"] == "Электроника"
    assert item["description"] == "Гаджеты и техника"
    assert item["parent_id"] is None
    assert item["is_active"] is True
    assert item["sort_order"] == 0


@pytest.mark.asyncio
async def test_list_categories_child_has_parent_id(categories_client: AsyncClient) -> None:
    response = await categories_client.get("/api/v1/categories")
    assert response.status_code == 200
    items = response.json()["items"]
    parent = next(i for i in items if i["slug"] == "elektronika")
    child = next(i for i in items if i["slug"] == "smartfony")
    assert child["parent_id"] == parent["id"]


@pytest.mark.asyncio
async def test_list_categories_empty_db(client: AsyncClient) -> None:
    response = await client.get("/api/v1/categories")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_categories_ordered_by_sort_order(categories_client: AsyncClient) -> None:
    response = await categories_client.get("/api/v1/categories")
    assert response.status_code == 200
    items = response.json()["items"]
    sort_orders = [i["sort_order"] for i in items]
    assert sort_orders == sorted(sort_orders)
