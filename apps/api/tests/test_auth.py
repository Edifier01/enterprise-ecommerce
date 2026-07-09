"""Auth API tests with in-memory SQLite."""

import uuid
from collections.abc import AsyncGenerator

import pytest
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def auth_client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client backed by isolated in-memory SQLite — no PostgreSQL required."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
async def auth_client_with_db() -> AsyncGenerator[tuple[AsyncClient, async_sessionmaker], None]:
    """HTTP client + raw session factory for tests that need direct DB manipulation."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, session_factory
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_register_success(auth_client: AsyncClient) -> None:
    response = await auth_client.post(
        "/api/v1/auth/register",
        json={"email": "user@example.com", "password": "secret123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "user@example.com"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(auth_client: AsyncClient) -> None:
    payload = {"email": "duplicate@example.com", "password": "secret123"}
    await auth_client.post("/api/v1/auth/register", json=payload)
    response = await auth_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success_returns_access_token(auth_client: AsyncClient) -> None:
    await auth_client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "password": "secret123"},
    )
    response = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "secret123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(auth_client: AsyncClient) -> None:
    await auth_client.post(
        "/api/v1/auth/register",
        json={"email": "badpw@example.com", "password": "correct123"},
    )
    response = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "badpw@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(auth_client: AsyncClient) -> None:
    response = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "somepassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user_returns_401(
    auth_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    """Inactive users must be rejected even with the correct password."""
    client, session_factory = auth_client_with_db

    await client.post(
        "/api/v1/auth/register",
        json={"email": "inactive@example.com", "password": "secret123"},
    )

    async with session_factory() as session:
        await session.execute(
            sa.text("UPDATE users SET is_active = 0 WHERE email = 'inactive@example.com'")
        )
        await session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@example.com", "password": "secret123"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_register_short_password_returns_422(auth_client: AsyncClient) -> None:
    """Passwords shorter than 8 characters must be rejected at the schema layer."""
    response = await auth_client.post(
        "/api/v1/auth/register",
        json={"email": "short@example.com", "password": "abc1234"},  # 7 chars — boundary
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email_returns_422(auth_client: AsyncClient) -> None:
    """Malformed email addresses must be rejected at the schema layer."""
    response = await auth_client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "validpassword"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_me_without_token_returns_401(auth_client: AsyncClient) -> None:
    response = await auth_client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_with_invalid_token_returns_401(auth_client: AsyncClient) -> None:
    response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_with_valid_token_returns_current_user(auth_client: AsyncClient) -> None:
    await auth_client.post(
        "/api/v1/auth/register",
        json={"email": "me@example.com", "password": "secret123"},
    )
    login_response = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "me@example.com", "password": "secret123"},
    )
    token = login_response.json()["access_token"]

    response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_login_merges_guest_cart_into_authenticated_cart(
    auth_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = auth_client_with_db
    product_id = uuid.uuid4()
    variant_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            ProductModel(
                id=product_id,
                name="Merge Cart Product",
                slug="merge-cart-product",
                price_cents=1500,
                currency="USD",
                in_stock=True,
            )
        )
        session.add(
            ProductVariantModel(
                id=variant_id,
                product_id=product_id,
                sku="MERGE-CART-SKU",
                name="Default",
                attributes={},
                price_cents=1500,
                in_stock=True,
                is_default=True,
                sort_order=0,
            )
        )
        session.add(
            InventoryItemModel(
                id=variant_id,
                variant_id=variant_id,
                quantity_on_hand=10,
                quantity_reserved=0,
                version=0,
            )
        )
        await session.commit()

    await client.post(
        "/api/v1/auth/register",
        json={"email": "merge-cart@example.com", "password": "secret123"},
    )
    add_response = await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(variant_id), "quantity": 2},
    )
    assert add_response.status_code == 200

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "merge-cart@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    cart_response = await client.get(
        "/api/v1/cart",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cart_response.status_code == 200
    data = cart_response.json()
    assert len(data["lines"]) == 1
    assert data["lines"][0]["variant_id"] == str(variant_id)
    assert data["lines"][0]["quantity"] == 2
