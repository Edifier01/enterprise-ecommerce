"""Admin inventory API tests."""

from collections.abc import AsyncGenerator
from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db_session
from app.features.admin.infrastructure.persistence.models import AdminUserModel
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_ADMIN_EMAIL = "admin@example.com"
_ADMIN_PASSWORD = "adminsecret1"
_VIEWER_EMAIL = "viewer@example.com"
_VARIANT_ID: UUID | None = None


@pytest.fixture
async def admin_inventory_client() -> AsyncGenerator[AsyncClient, None]:
    global _VARIANT_ID
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
            product = ProductModel(
                name="Stock Test Product",
                slug="stock-test-product",
                price_cents=1000,
                currency="USD",
                in_stock=True,
                status="active",
            )
            session.add(product)
            await session.flush()

            variant = ProductVariantModel(
                product_id=product.id,
                sku="STOCK-TEST-1",
                name="Default",
                price_cents=1000,
                in_stock=True,
                is_default=True,
                sort_order=0,
                attributes={},
            )
            session.add(variant)
            await session.flush()
            _VARIANT_ID = variant.id

            session.add(
                InventoryItemModel(
                    variant_id=variant.id,
                    quantity_on_hand=20,
                    quantity_reserved=5,
                    version=0,
                )
            )
            await session.commit()
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


async def _token(client: AsyncClient, email: str = _ADMIN_EMAIL) -> str:
    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": email, "password": _ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_admin_list_inventory(admin_inventory_client: AsyncClient) -> None:
    token = await _token(admin_inventory_client)
    response = await admin_inventory_client.get(
        "/api/v1/admin/inventory",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["sku"] == "STOCK-TEST-1"
    assert item["sync_source"] == "manual"
    assert item["quantity_on_hand"] == 20
    assert item["quantity_reserved"] == 5
    assert item["available"] == 15


@pytest.mark.asyncio
async def test_admin_list_inventory_grouped_by_product(
    admin_inventory_client: AsyncClient,
) -> None:
    token = await _token(admin_inventory_client)
    response = await admin_inventory_client.get(
        "/api/v1/admin/inventory?group_by=product",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["group_by"] == "product"
    assert data["total"] == 1
    assert data["items"] == []
    group = data["groups"][0]
    assert group["product_name"] == "Stock Test Product"
    assert group["total_available"] == 15
    assert group["variant_count"] == 1
    assert len(group["variants"]) == 1
    assert group["variants"][0]["sku"] == "STOCK-TEST-1"


@pytest.mark.asyncio
async def test_admin_inventory_overview(admin_inventory_client: AsyncClient) -> None:
    token = await _token(admin_inventory_client)
    response = await admin_inventory_client.get(
        "/api/v1/admin/inventory/overview",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_variants"] == 1
    assert data["total_products"] == 1
    assert data["low_stock_variants"] == 0
    assert data["low_stock_products"] == 0
    assert data["out_of_stock_variants"] == 0
    assert data["out_of_stock_products"] == 0
    assert data["low_stock_threshold"] == settings.admin_low_stock_threshold


@pytest.mark.asyncio
async def test_admin_list_inventory_sku_search(admin_inventory_client: AsyncClient) -> None:
    token = await _token(admin_inventory_client)
    response = await admin_inventory_client.get(
        "/api/v1/admin/inventory?q=STOCK-TEST",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1

    miss = await admin_inventory_client.get(
        "/api/v1/admin/inventory?q=UNKNOWN-SKU",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert miss.status_code == 200
    assert miss.json()["total"] == 0


@pytest.mark.asyncio
async def test_admin_list_low_stock_filter(admin_inventory_client: AsyncClient) -> None:
    token = await _token(admin_inventory_client)
    response = await admin_inventory_client.get(
        "/api/v1/admin/inventory?low_stock=false",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1


@pytest.mark.asyncio
async def test_admin_adjust_inventory_disabled_by_default(
    admin_inventory_client: AsyncClient,
) -> None:
    token = await _token(admin_inventory_client)
    assert _VARIANT_ID is not None
    response = await admin_inventory_client.patch(
        f"/api/v1/admin/inventory/{_VARIANT_ID}",
        headers={"Authorization": f"Bearer {token}"},
        json={"quantity_on_hand": 30, "reason": "restock", "version": 0},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_adjust_inventory_success_when_enabled(
    admin_inventory_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "admin_inventory_manual_adjust_enabled", True)
    token = await _token(admin_inventory_client)
    assert _VARIANT_ID is not None
    response = await admin_inventory_client.patch(
        f"/api/v1/admin/inventory/{_VARIANT_ID}",
        headers={"Authorization": f"Bearer {token}"},
        json={"quantity_on_hand": 30, "reason": "restock", "version": 0},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["quantity_on_hand"] == 30
    assert data["available"] == 25
    assert data["version"] == 1


@pytest.mark.asyncio
async def test_admin_adjust_below_reserved_returns_422(
    admin_inventory_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "admin_inventory_manual_adjust_enabled", True)
    token = await _token(admin_inventory_client)
    assert _VARIANT_ID is not None
    response = await admin_inventory_client.patch(
        f"/api/v1/admin/inventory/{_VARIANT_ID}",
        headers={"Authorization": f"Bearer {token}"},
        json={"quantity_on_hand": 3, "reason": "correction", "version": 0},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_adjust_version_conflict_returns_409(
    admin_inventory_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "admin_inventory_manual_adjust_enabled", True)
    token = await _token(admin_inventory_client)
    assert _VARIANT_ID is not None
    response = await admin_inventory_client.patch(
        f"/api/v1/admin/inventory/{_VARIANT_ID}",
        headers={"Authorization": f"Bearer {token}"},
        json={"quantity_on_hand": 40, "reason": "restock", "version": 99},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_viewer_cannot_adjust_inventory_returns_403(admin_inventory_client: AsyncClient) -> None:
    token = await _token(admin_inventory_client, email=_VIEWER_EMAIL)
    assert _VARIANT_ID is not None
    response = await admin_inventory_client.patch(
        f"/api/v1/admin/inventory/{_VARIANT_ID}",
        headers={"Authorization": f"Bearer {token}"},
        json={"quantity_on_hand": 50, "reason": "restock", "version": 0},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_inventory_includes_sync_source_for_moysklad(
    admin_inventory_client: AsyncClient,
) -> None:
    token = await _token(admin_inventory_client)
    assert _VARIANT_ID is not None

    override = app.dependency_overrides.get(get_db_session)
    assert override is not None

    async for session in override():
        product = await session.scalar(
            select(ProductModel)
            .join(ProductVariantModel, ProductVariantModel.product_id == ProductModel.id)
            .where(ProductVariantModel.id == _VARIANT_ID)
        )
        assert product is not None
        product.sync_source = "moysklad"
        await session.commit()
        break

    response = await admin_inventory_client.get(
        "/api/v1/admin/inventory",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["sync_source"] == "moysklad"

    adjust = await admin_inventory_client.patch(
        f"/api/v1/admin/inventory/{_VARIANT_ID}",
        headers={"Authorization": f"Bearer {token}"},
        json={"quantity_on_hand": 50, "reason": "restock", "version": 0},
    )
    assert adjust.status_code == 403
