"""Admin customer management API tests (ADR-008)."""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.admin.infrastructure.persistence.models import AdminUserModel
from app.features.auth.infrastructure.persistence.models import UserModel
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_ADMIN_EMAIL = "admin@example.com"
_ADMIN_PASSWORD = "adminsecret1"
_VIEWER_EMAIL = "viewer@example.com"
_CUSTOMER_EMAIL = "customer@example.com"


@pytest.fixture
async def admin_customers_client() -> AsyncGenerator[AsyncClient, None]:
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
                    email=_ADMIN_EMAIL,
                    hashed_password=hasher.hash(_ADMIN_PASSWORD),
                    role="superadmin",
                    is_active=True,
                )
            )
            session.add(
                AdminUserModel(
                    email=_VIEWER_EMAIL,
                    hashed_password=hasher.hash(_ADMIN_PASSWORD),
                    role="viewer",
                    is_active=True,
                )
            )
            session.add(
                UserModel(
                    email=_CUSTOMER_EMAIL,
                    hashed_password=hasher.hash("customer12"),
                    is_active=True,
                    is_wholesaler=False,
                )
            )
            await session.commit()
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


async def _admin_token(client: AsyncClient, email: str = _ADMIN_EMAIL) -> str:
    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": email, "password": _ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_admin_list_customers(admin_customers_client: AsyncClient) -> None:
    token = await _admin_token(admin_customers_client)
    response = await admin_customers_client.get(
        "/api/v1/admin/customers",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    emails = {item["email"] for item in data["items"]}
    assert _CUSTOMER_EMAIL in emails


@pytest.mark.asyncio
async def test_admin_grant_wholesaler_status(admin_customers_client: AsyncClient) -> None:
    token = await _admin_token(admin_customers_client)
    listed = await admin_customers_client.get(
        "/api/v1/admin/customers",
        headers={"Authorization": f"Bearer {token}"},
    )
    customer_id = next(
        item["id"] for item in listed.json()["items"] if item["email"] == _CUSTOMER_EMAIL
    )

    response = await admin_customers_client.patch(
        f"/api/v1/admin/customers/{customer_id}/wholesaler",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_wholesaler": True},
    )
    assert response.status_code == 200
    assert response.json()["is_wholesaler"] is True


@pytest.mark.asyncio
async def test_admin_revoke_wholesaler_status(admin_customers_client: AsyncClient) -> None:
    token = await _admin_token(admin_customers_client)
    listed = await admin_customers_client.get(
        "/api/v1/admin/customers",
        headers={"Authorization": f"Bearer {token}"},
    )
    customer_id = next(
        item["id"] for item in listed.json()["items"] if item["email"] == _CUSTOMER_EMAIL
    )

    await admin_customers_client.patch(
        f"/api/v1/admin/customers/{customer_id}/wholesaler",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_wholesaler": True},
    )
    response = await admin_customers_client.patch(
        f"/api/v1/admin/customers/{customer_id}/wholesaler",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_wholesaler": False},
    )
    assert response.status_code == 200
    assert response.json()["is_wholesaler"] is False


@pytest.mark.asyncio
async def test_viewer_can_list_customers(admin_customers_client: AsyncClient) -> None:
    viewer_token = await _admin_token(admin_customers_client, email=_VIEWER_EMAIL)
    response = await admin_customers_client.get(
        "/api/v1/admin/customers",
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] >= 1


@pytest.mark.asyncio
async def test_viewer_cannot_update_wholesaler_returns_403(
    admin_customers_client: AsyncClient,
) -> None:
    token = await _admin_token(admin_customers_client)
    listed = await admin_customers_client.get(
        "/api/v1/admin/customers",
        headers={"Authorization": f"Bearer {token}"},
    )
    customer_id = listed.json()["items"][0]["id"]

    viewer_token = await _admin_token(admin_customers_client, email=_VIEWER_EMAIL)
    response = await admin_customers_client.patch(
        f"/api/v1/admin/customers/{customer_id}/wholesaler",
        headers={"Authorization": f"Bearer {viewer_token}"},
        json={"is_wholesaler": True},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_customers_without_token_returns_401(
    admin_customers_client: AsyncClient,
) -> None:
    response = await admin_customers_client.get("/api/v1/admin/customers")
    assert response.status_code == 401
