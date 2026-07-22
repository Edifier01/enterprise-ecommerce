"""Admin API tests."""

from collections.abc import AsyncGenerator

from tests.auth_helpers import mark_user_email_verified
from tests.auth_payloads import retail_register_payload

import pytest
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.admin.infrastructure.persistence.models import AdminUserModel
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_TEST_ADMIN_EMAIL = "admin@example.com"
_TEST_ADMIN_PASSWORD = "adminsecret1"


@pytest.fixture
async def admin_client() -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    hasher = BcryptPasswordHasher()

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with session_factory() as session:
            session.add(
                AdminUserModel(
                    email=_TEST_ADMIN_EMAIL,
                    hashed_password=hasher.hash(_TEST_ADMIN_PASSWORD),
                    role="superadmin",
                    is_active=True,
                )
            )
            session.add(
                AdminUserModel(
                    email="viewer@test.local",
                    hashed_password=hasher.hash(_TEST_ADMIN_PASSWORD),
                    role="viewer",
                    is_active=True,
                )
            )
            await session.commit()
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
async def admin_client_with_db() -> AsyncGenerator[
    tuple[AsyncClient, async_sessionmaker], None
]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    hasher = BcryptPasswordHasher()

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with session_factory() as session:
            session.add(
                AdminUserModel(
                    email=_TEST_ADMIN_EMAIL,
                    hashed_password=hasher.hash(_TEST_ADMIN_PASSWORD),
                    role="superadmin",
                    is_active=True,
                )
            )
            await session.commit()
        yield ac, session_factory
    app.dependency_overrides.clear()
    await engine.dispose()


async def _admin_token(client: AsyncClient) -> str:
    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": _TEST_ADMIN_EMAIL, "password": _TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_admin_login_success(admin_client: AsyncClient) -> None:
    response = await admin_client.post(
        "/api/v1/admin/auth/login",
        json={"email": _TEST_ADMIN_EMAIL, "password": _TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_admin_login_wrong_password_returns_401(admin_client: AsyncClient) -> None:
    response = await admin_client.post(
        "/api/v1/admin/auth/login",
        json={"email": _TEST_ADMIN_EMAIL, "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_me_without_token_returns_401(admin_client: AsyncClient) -> None:
    response = await admin_client.get("/api/v1/admin/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_me_with_customer_token_returns_401(
    admin_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = admin_client_with_db
    await client.post(
        "/api/v1/auth/register",
        json=retail_register_payload("customer@example.com", password="customer12"),
    )
    await mark_user_email_verified(session_factory, "customer@example.com")
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "customer@example.com", "password": "customer12"},
    )
    customer_token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/admin/auth/me",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_me_with_valid_token_returns_admin(admin_client: AsyncClient) -> None:
    token = await _admin_token(admin_client)
    response = await admin_client.get(
        "/api/v1/admin/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == _TEST_ADMIN_EMAIL
    assert data["role"] == "superadmin"
    assert "admin:read" in data["permissions"]


@pytest.mark.asyncio
async def test_admin_dashboard_summary_returns_metrics(admin_client: AsyncClient) -> None:
    token = await _admin_token(admin_client)
    response = await admin_client.get(
        "/api/v1/admin/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["orders_today"] == 0
    assert data["orders_last_7_days"] == 0
    assert data["revenue_last_7_days_cents"] == 0
    assert "orders_by_status" in data


@pytest.mark.asyncio
async def test_admin_dashboard_without_token_returns_401(admin_client: AsyncClient) -> None:
    response = await admin_client.get("/api/v1/admin/dashboard/summary")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_login_rate_limit_returns_429(
    admin_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import settings
    from app.core.middleware import CheckoutRateLimitMiddleware

    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(CheckoutRateLimitMiddleware, "ADMIN_LOGIN_LIMIT", 2)
    headers = {"X-Forwarded-For": "203.0.113.50"}

    for _ in range(2):
        response = await admin_client.post(
            "/api/v1/admin/auth/login",
            json={"email": _TEST_ADMIN_EMAIL, "password": "wrong-password"},
            headers=headers,
        )
        assert response.status_code == 401

    blocked = await admin_client.post(
        "/api/v1/admin/auth/login",
        json={"email": _TEST_ADMIN_EMAIL, "password": _TEST_ADMIN_PASSWORD},
        headers=headers,
    )
    assert blocked.status_code == 429


@pytest.mark.asyncio
async def test_admin_mfa_routes_removed(admin_client: AsyncClient) -> None:
    token = await _admin_token(admin_client)
    headers = {"Authorization": f"Bearer {token}"}

    for method, path in (
        ("post", "/api/v1/admin/auth/mfa/enroll"),
        ("post", "/api/v1/admin/auth/mfa/confirm"),
        ("post", "/api/v1/admin/auth/mfa/verify"),
        ("post", "/api/v1/admin/auth/mfa/disable"),
        ("post", "/api/v1/admin/auth/mfa/backup-codes/regenerate"),
    ):
        response = await getattr(admin_client, method)(path, headers=headers, json={})
        assert response.status_code == 404, path


@pytest.mark.asyncio
async def test_admin_login_inactive_returns_401(
    admin_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = admin_client_with_db

    async with session_factory() as session:
        await session.execute(
            sa.text("UPDATE admin_users SET is_active = 0 WHERE email = :email"),
            {"email": _TEST_ADMIN_EMAIL},
        )
        await session.commit()

    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": _TEST_ADMIN_EMAIL, "password": _TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_login_lockout_after_max_attempts(
    admin_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "admin_login_max_attempts", 3)
    monkeypatch.setattr(settings, "admin_login_lockout_minutes", 15)

    for _ in range(2):
        response = await admin_client.post(
            "/api/v1/admin/auth/login",
            json={"email": _TEST_ADMIN_EMAIL, "password": "wrong-password"},
        )
        assert response.status_code == 401

    locked = await admin_client.post(
        "/api/v1/admin/auth/login",
        json={"email": _TEST_ADMIN_EMAIL, "password": "wrong-password"},
    )
    assert locked.status_code == 429
    assert locked.headers.get("Retry-After") is not None

    still_locked = await admin_client.post(
        "/api/v1/admin/auth/login",
        json={"email": _TEST_ADMIN_EMAIL, "password": _TEST_ADMIN_PASSWORD},
    )
    assert still_locked.status_code == 429


@pytest.mark.asyncio
async def test_admin_login_ip_allowlist_blocks_unknown_ip(
    admin_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "admin_login_allowed_ips_env", "203.0.113.1")
    monkeypatch.setattr(settings, "trusted_proxy_hops", 1)

    response = await admin_client.post(
        "/api/v1/admin/auth/login",
        json={"email": _TEST_ADMIN_EMAIL, "password": _TEST_ADMIN_PASSWORD},
        headers={"X-Forwarded-For": "203.0.113.99"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_login_ip_allowlist_ignores_spoofed_xff_without_trusted_proxy(
    admin_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "admin_login_allowed_ips_env", "203.0.113.1")
    monkeypatch.setattr(settings, "trusted_proxy_hops", 0)

    response = await admin_client.post(
        "/api/v1/admin/auth/login",
        json={"email": _TEST_ADMIN_EMAIL, "password": _TEST_ADMIN_PASSWORD},
        headers={"X-Forwarded-For": "203.0.113.1"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_me_rejects_token_without_is_active_claim(
    admin_client: AsyncClient,
) -> None:
    from jose import jwt

    from app.core.config import settings

    login = await admin_client.post(
        "/api/v1/admin/auth/login",
        json={"email": _TEST_ADMIN_EMAIL, "password": _TEST_ADMIN_PASSWORD},
    )
    valid_token = login.json()["access_token"]
    payload = jwt.decode(
        valid_token,
        settings.jwt_secret_key.get_secret_value(),
        algorithms=[settings.jwt_algorithm],
    )
    payload.pop("is_active", None)
    legacy_token = jwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )

    response = await admin_client.get(
        "/api/v1/admin/auth/me",
        headers={"Authorization": f"Bearer {legacy_token}"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_media_upload_rate_limit_returns_429(
    admin_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "admin_media_upload_limit_per_minute", 2)

    token = await _admin_token(admin_client)
    headers = {"Authorization": f"Bearer {token}", "X-Forwarded-For": "203.0.113.77"}
    png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    files = {"file": ("test.png", png_header, "image/png")}

    for _ in range(2):
        response = await admin_client.post(
            "/api/v1/admin/media/upload",
            headers=headers,
            files=files,
        )
        assert response.status_code == 200

    blocked = await admin_client.post(
        "/api/v1/admin/media/upload",
        headers=headers,
        files=files,
    )
    assert blocked.status_code == 429
