"""Auth API tests with in-memory SQLite."""

import re
from tests.auth_payloads import retail_register_payload, wholesaler_register_payload

import uuid
from collections.abc import AsyncGenerator

import pytest
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.auth.infrastructure.email.recording_email_service import RecordingEmailService
from app.features.auth.presentation.dependencies import get_email_service
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_recording_email = RecordingEmailService()


def _extract_token_from_email(body: str) -> str:
    match = re.search(r"token=([A-Za-z0-9_-]+)", body)
    assert match is not None, f"Token not found in email body: {body}"
    return match.group(1)


async def _verify_user_from_last_email(client: AsyncClient) -> None:
    message = _recording_email.last
    assert message is not None
    token = _extract_token_from_email(message.body_text)
    response = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert response.status_code == 200


@pytest.fixture(autouse=True)
def _reset_recording_email() -> None:
    _recording_email.clear()
    app.dependency_overrides[get_email_service] = lambda: _recording_email
    yield
    app.dependency_overrides.pop(get_email_service, None)
    _recording_email.clear()


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
        json=retail_register_payload("user@example.com"),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["first_name"] == "Тест"
    assert data["last_name"] == "Пользователь"
    assert data["email_verification_required"] is True
    assert "id" in data
    assert "created_at" in data
    assert _recording_email.last is not None


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(auth_client: AsyncClient) -> None:
    payload = retail_register_payload("duplicate@example.com")
    await auth_client.post("/api/v1/auth/register", json=payload)
    response = await auth_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success_returns_access_token(auth_client: AsyncClient) -> None:
    await auth_client.post(
        "/api/v1/auth/register",
        json=retail_register_payload("login@example.com"),
    )
    await _verify_user_from_last_email(auth_client)
    response = await auth_client.post(
        "/api/v1/auth/login",
        json=retail_register_payload("login@example.com"),
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_unverified_email_returns_403(auth_client: AsyncClient) -> None:
    await auth_client.post(
        "/api/v1/auth/register",
        json=retail_register_payload("unverified@example.com"),
    )
    response = await auth_client.post(
        "/api/v1/auth/login",
        json=retail_register_payload("unverified@example.com"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Email not verified"


@pytest.mark.asyncio
async def test_verify_email_success(auth_client: AsyncClient) -> None:
    await auth_client.post(
        "/api/v1/auth/register",
        json=retail_register_payload("verify@example.com"),
    )
    await _verify_user_from_last_email(auth_client)
    login_response = await auth_client.post(
        "/api/v1/auth/login",
        json=retail_register_payload("verify@example.com"),
    )
    assert login_response.status_code == 200


@pytest.mark.asyncio
async def test_forgot_and_reset_password(auth_client: AsyncClient) -> None:
    await auth_client.post(
        "/api/v1/auth/register",
        json=retail_register_payload("reset@example.com"),
    )
    await _verify_user_from_last_email(auth_client)

    forgot_response = await auth_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset@example.com"},
    )
    assert forgot_response.status_code == 200
    reset_message = _recording_email.last
    assert reset_message is not None
    token = _extract_token_from_email(reset_message.body_text)

    reset_response = await auth_client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "password": "newpassword123"},
    )
    assert reset_response.status_code == 200

    old_login = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "secret123"},
    )
    assert old_login.status_code == 401

    new_login = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "newpassword123"},
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(auth_client: AsyncClient) -> None:
    await auth_client.post(
        "/api/v1/auth/register",
        json=retail_register_payload("badpw@example.com", password="correct123"),
    )
    await _verify_user_from_last_email(auth_client)
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
        json=retail_register_payload("inactive@example.com"),
    )
    await _verify_user_from_last_email(client)

    async with session_factory() as session:
        await session.execute(
            sa.text("UPDATE users SET is_active = 0 WHERE email = 'inactive@example.com'")
        )
        await session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json=retail_register_payload("inactive@example.com"),
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_register_short_password_returns_422(auth_client: AsyncClient) -> None:
    """Passwords shorter than 8 characters must be rejected at the schema layer."""
    response = await auth_client.post(
        "/api/v1/auth/register",
        json=retail_register_payload("short@example.com", password="abc1234"),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email_returns_422(auth_client: AsyncClient) -> None:
    """Malformed email addresses must be rejected at the schema layer."""
    response = await auth_client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Тест",
            "last_name": "Пользователь",
            "email": "not-an-email",
            "password": "validpassword",
        },
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
        json=retail_register_payload("me@example.com"),
    )
    await _verify_user_from_last_email(auth_client)
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
    assert data["is_wholesaler"] is False
    assert data["email_verified"] is True
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
        json=retail_register_payload("merge-cart@example.com"),
    )
    await _verify_user_from_last_email(client)
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


@pytest.mark.asyncio
async def test_register_wholesaler_success(auth_client: AsyncClient) -> None:
    response = await auth_client.post(
        "/api/v1/auth/register/wholesaler",
        json=wholesaler_register_payload("wholesale-new@example.com"),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "wholesale-new@example.com"
    assert data["email_verification_required"] is True

    await _verify_user_from_last_email(auth_client)
    login_response = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "wholesale-new@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    me_response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["is_wholesaler"] is True


@pytest.mark.asyncio
async def test_register_wholesaler_duplicate_email_returns_409(auth_client: AsyncClient) -> None:
    payload = wholesaler_register_payload("wholesale-dup@example.com")
    await auth_client.post("/api/v1/auth/register/wholesaler", json=payload)
    response = await auth_client.post("/api/v1/auth/register/wholesaler", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_wholesaler_duplicate_inn_returns_409(auth_client: AsyncClient) -> None:
    await auth_client.post(
        "/api/v1/auth/register/wholesaler",
        json=wholesaler_register_payload("wholesale-inn1@example.com", inn="987654321098"),
    )
    response = await auth_client.post(
        "/api/v1/auth/register/wholesaler",
        json=wholesaler_register_payload(
            "wholesale-inn2@example.com",
            inn="987654321098",
            ogrnip="987654321098765",
        ),
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_wholesaler_invalid_inn_returns_422(auth_client: AsyncClient) -> None:
    response = await auth_client.post(
        "/api/v1/auth/register/wholesaler",
        json=wholesaler_register_payload("wholesale-bad@example.com", inn="12345"),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_auth_login_rate_limit_returns_429(
    auth_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import settings
    from app.core.middleware import CheckoutRateLimitMiddleware

    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(CheckoutRateLimitMiddleware, "AUTH_LOGIN_LIMIT", 2)
    headers = {"X-Forwarded-For": "203.0.113.99"}

    for _ in range(2):
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={"email": "missing@example.com", "password": "wrong-password"},
            headers=headers,
        )
        assert response.status_code == 401

    blocked = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "missing@example.com", "password": "wrong-password"},
        headers=headers,
    )
    assert blocked.status_code == 429
    assert blocked.headers.get("Retry-After") is not None
