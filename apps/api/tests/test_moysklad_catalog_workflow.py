"""Tests for MoySklad catalog workflow — visibility, stock threshold, category delete."""

from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db_session
from app.features.admin.infrastructure.persistence.models import AdminUserModel
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher
from app.features.catalog.domain.stock_availability import is_in_stock_for_storefront
from app.features.catalog.infrastructure.persistence.models import CategoryModel, ProductModel
from app.features.integrations.moysklad.infrastructure.persistence.catalog_sync_repository import (
    CatalogSyncRepository,
)
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_ADMIN_EMAIL = "admin@example.com"
_ADMIN_PASSWORD = "adminsecret1"


@pytest.fixture
async def workflow_client() -> AsyncGenerator[AsyncClient, None]:
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
            category = CategoryModel(
                id=uuid4(),
                slug="test-cat",
                name="Test",
                is_active=True,
                sort_order=0,
            )
            session.add(category)
            session.add(
                ProductModel(
                    id=uuid4(),
                    name="MS hidden",
                    slug="ms-hidden",
                    price_cents=1000,
                    currency="RUB",
                    in_stock=True,
                    status="active",
                    sync_source="moysklad",
                    category_id=None,
                )
            )
            session.add(
                ProductModel(
                    id=uuid4(),
                    name="MS visible",
                    slug="ms-visible",
                    price_cents=2000,
                    currency="RUB",
                    in_stock=True,
                    status="active",
                    sync_source="moysklad",
                    category_id=category.id,
                )
            )
            session.add(
                ProductModel(
                    id=uuid4(),
                    name="Manual uncategorized",
                    slug="manual-uncat",
                    price_cents=3000,
                    currency="RUB",
                    in_stock=True,
                    status="active",
                    sync_source="manual",
                    category_id=None,
                )
            )
            await session.commit()
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


async def _admin_token(client: AsyncClient) -> str:
    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": _ADMIN_EMAIL, "password": _ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_storefront_min_stock_threshold() -> None:
    original = settings.storefront_min_available_stock
    settings.storefront_min_available_stock = 3
    try:
        assert is_in_stock_for_storefront(2) is False
        assert is_in_stock_for_storefront(3) is True
        assert is_in_stock_for_storefront(10) is True
    finally:
        settings.storefront_min_available_stock = original


@pytest.mark.asyncio
async def test_public_catalog_hides_uncategorized_moysklad_products(
    workflow_client: AsyncClient,
) -> None:
    response = await workflow_client.get("/api/v1/products")
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["items"]}
    assert "ms-hidden" not in slugs
    assert "ms-visible" in slugs
    assert "manual-uncat" in slugs


@pytest.mark.asyncio
async def test_admin_moysklad_pending_filter(workflow_client: AsyncClient) -> None:
    token = await _admin_token(workflow_client)
    response = await workflow_client.get(
        "/api/v1/admin/catalog/products?moysklad_pending=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["items"]}
    assert slugs == {"ms-hidden"}


@pytest.mark.asyncio
async def test_admin_delete_category_unlinks_products(workflow_client: AsyncClient) -> None:
    token = await _admin_token(workflow_client)
    categories = await workflow_client.get(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
    )
    category_id = categories.json()["items"][0]["id"]

    delete_response = await workflow_client.delete(
        f"/api/v1/admin/catalog/categories/{category_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_response.status_code == 204

    public_response = await workflow_client.get("/api/v1/products")
    slugs = {item["slug"] for item in public_response.json()["items"]}
    assert "ms-visible" not in slugs


@pytest.mark.asyncio
async def test_moysklad_status_includes_pending_imports(workflow_client: AsyncClient) -> None:
    token = await _admin_token(workflow_client)
    response = await workflow_client.get(
        "/api/v1/admin/integrations/moysklad/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["pending_imports"] == 1


@pytest.mark.asyncio
async def test_apply_stock_respects_threshold() -> None:
    original = settings.storefront_min_available_stock
    settings.storefront_min_available_stock = 3

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            from app.features.catalog.infrastructure.persistence.models import ProductVariantModel

            product_id = uuid4()
            variant_id = uuid4()
            session.add(
                ProductModel(
                    id=product_id,
                    name="Stock test",
                    slug="stock-test",
                    price_cents=1000,
                    currency="RUB",
                    in_stock=False,
                    status="draft",
                    sync_source="moysklad",
                )
            )
            session.add(
                ProductVariantModel(
                    id=variant_id,
                    product_id=product_id,
                    sku="SKU-1",
                    name="Default",
                    price_cents=1000,
                    in_stock=False,
                    is_default=True,
                    sort_order=0,
                    moysklad_variant_id="ms-var-1",
                )
            )
            await session.commit()

            repo = CatalogSyncRepository(session)
            variant = await session.get(ProductVariantModel, variant_id)
            assert variant is not None
            await repo.apply_stock(variant, 2)
            await session.refresh(variant)
            assert variant.in_stock is False

            await repo.apply_stock(variant, 3)
            await session.refresh(variant)
            assert variant.in_stock is True
    finally:
        settings.storefront_min_available_stock = original
        await engine.dispose()
