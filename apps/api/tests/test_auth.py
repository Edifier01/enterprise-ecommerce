"""Auth API tests with in-memory SQLite."""

from collections.abc import AsyncGenerator

import pytest
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
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
