"""Admin bulk job API tests."""

import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.admin.application.bulk_job_runner import run_admin_bulk_job
from app.features.admin.infrastructure.persistence.bulk_job_models import AdminBulkJobModel  # noqa: F401
from app.features.admin.infrastructure.persistence.models import AdminUserModel
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher
from app.features.catalog.infrastructure.persistence.models import CategoryModel, ProductModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_ADMIN_EMAIL = "admin@example.com"
_ADMIN_PASSWORD = "adminsecret1"


@pytest.fixture
async def admin_bulk_jobs_client(monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    monkeypatch.setattr(
        "app.features.admin.presentation.bulk_job_router.schedule_admin_bulk_job",
        lambda _job_id: None,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        hasher = BcryptPasswordHasher()
        category_id = uuid.uuid4()
        product_id = uuid.uuid4()
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
                CategoryModel(
                    id=category_id,
                    name="Test Category",
                    slug="test-category",
                    sort_order=0,
                )
            )
            session.add(
                ProductModel(
                    id=product_id,
                    name="Pending Import",
                    slug="pending-import",
                    price_cents=1000,
                    currency="RUB",
                    in_stock=False,
                    status="draft",
                    sync_source="moysklad",
                    category_id=None,
                )
            )
            await session.commit()

        ac._test_product_id = product_id  # type: ignore[attr-defined]
        ac._test_category_id = category_id  # type: ignore[attr-defined]
        ac._test_session_factory = session_factory  # type: ignore[attr-defined]
        yield ac

    app.dependency_overrides.clear()
    await engine.dispose()


async def _token(client: AsyncClient) -> str:
    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": _ADMIN_EMAIL, "password": _ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_admin_bulk_assign_category_job(admin_bulk_jobs_client: AsyncClient) -> None:
    token = await _token(admin_bulk_jobs_client)
    product_id = admin_bulk_jobs_client._test_product_id  # type: ignore[attr-defined]
    category_id = admin_bulk_jobs_client._test_category_id  # type: ignore[attr-defined]

    create_response = await admin_bulk_jobs_client.post(
        "/api/v1/admin/jobs/bulk",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "job_type": "assign_category",
            "product_ids": [str(product_id)],
            "category_id": str(category_id),
        },
    )
    assert create_response.status_code == 202
    job_id = create_response.json()["id"]
    assert create_response.json()["status"] == "pending"

    await run_admin_bulk_job(
        uuid.UUID(job_id),
        session_factory=admin_bulk_jobs_client._test_session_factory,  # type: ignore[attr-defined]
    )

    status_response = await admin_bulk_jobs_client.get(
        f"/api/v1/admin/jobs/bulk/{job_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert status_response.status_code == 200
    data = status_response.json()
    assert data["status"] == "completed"
    assert data["succeeded"] == 1
    assert data["processed"] == 1
