"""Admin catalog API tests."""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.admin.infrastructure.persistence.models import AdminUserModel
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher
from app.features.catalog.infrastructure.persistence.models import ProductModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_ADMIN_EMAIL = "admin@example.com"
_ADMIN_PASSWORD = "adminsecret1"
_VIEWER_EMAIL = "viewer@example.com"


@pytest.fixture
async def admin_catalog_client() -> AsyncGenerator[AsyncClient, None]:
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
                ProductModel(
                    name="Visible Product",
                    slug="visible-product",
                    price_cents=1000,
                    currency="USD",
                    in_stock=True,
                    status="active",
                )
            )
            session.add(
                ProductModel(
                    name="Draft Product",
                    slug="draft-product",
                    price_cents=2000,
                    currency="USD",
                    in_stock=True,
                    status="draft",
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
async def test_admin_create_product_success(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.post(
        "/api/v1/admin/catalog/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "New Admin Product",
            "slug": "new-admin-product",
            "sku": "NEW-ADMIN-1",
            "price_cents": 4500,
            "status": "draft",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == "new-admin-product"
    assert data["status"] == "draft"
    assert len(data["variants"]) == 1
    assert data["variants"][0]["sku"] == "NEW-ADMIN-1"


@pytest.mark.asyncio
async def test_admin_list_products_includes_drafts(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    statuses = {item["status"] for item in data["items"]}
    assert "draft" in statuses
    assert "active" in statuses


@pytest.mark.asyncio
async def test_public_catalog_hides_draft_products(admin_catalog_client: AsyncClient) -> None:
    response = await admin_catalog_client.get("/api/v1/products")
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["items"]}
    assert "visible-product" in slugs
    assert "draft-product" not in slugs


@pytest.mark.asyncio
async def test_admin_archive_product(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    listed = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?status=active",
        headers={"Authorization": f"Bearer {token}"},
    )
    product_id = listed.json()["items"][0]["id"]

    response = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "archived"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "archived"


@pytest.mark.asyncio
async def test_admin_create_duplicate_slug_returns_409(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.post(
        "/api/v1/admin/catalog/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Duplicate",
            "slug": "visible-product",
            "sku": "DUP-001",
            "price_cents": 1000,
            "status": "draft",
        },
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_viewer_cannot_create_product_returns_403(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client, email=_VIEWER_EMAIL)
    response = await admin_catalog_client.post(
        "/api/v1/admin/catalog/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Blocked",
            "slug": "blocked-product",
            "sku": "BLK-001",
            "price_cents": 1000,
            "status": "draft",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_create_product_with_wholesale_price(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.post(
        "/api/v1/admin/catalog/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Wholesale Admin Product",
            "slug": "wholesale-admin-product",
            "sku": "WHOLESALE-ADMIN-1",
            "price_cents": 5000,
            "wholesale_price_cents": 4000,
            "status": "active",
        },
    )
    assert response.status_code == 201
    assert response.json()["variants"][0]["wholesale_price_cents"] == 4000


@pytest.mark.asyncio
async def test_admin_rejects_wholesale_above_retail(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.post(
        "/api/v1/admin/catalog/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Invalid Wholesale",
            "slug": "invalid-wholesale-product",
            "sku": "INVALID-WHOLESALE-1",
            "price_cents": 3000,
            "wholesale_price_cents": 3500,
            "status": "draft",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_create_product_with_content_fields(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.post(
        "/api/v1/admin/catalog/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Content Rich Product",
            "slug": "content-rich-product",
            "sku": "CONTENT-001",
            "price_cents": 9900,
            "compare_at_price_cents": 12900,
            "description": "Detailed product description for storefront.",
            "image_url": "https://cdn.example.com/products/content-rich.jpg",
            "status": "active",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["description"] == "Detailed product description for storefront."
    assert data["image_url"] == "https://cdn.example.com/products/content-rich.jpg"
    assert data["compare_at_price_cents"] == 12900


@pytest.mark.asyncio
async def test_admin_create_and_list_categories(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    created = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "slug": "admin-test-cat",
            "name": "Admin Test Category",
            "sort_order": 5,
        },
    )
    assert created.status_code == 201
    category_id = created.json()["id"]

    listed = await admin_catalog_client.get(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert listed.status_code == 200
    items = listed.json()["items"]
    ids = {item["id"] for item in items}
    assert category_id in ids
    listed_category = next(item for item in items if item["id"] == category_id)
    assert "product_count" in listed_category
    assert listed_category["product_count"] == 0

    updated = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/categories/{category_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": False},
    )
    assert updated.status_code == 200
    assert updated.json()["is_active"] is False


@pytest.mark.asyncio
async def test_admin_search_products_by_name(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?q=draft",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "draft-product"


@pytest.mark.asyncio
async def test_admin_search_includes_all_statuses(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?q=product&status=draft",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1


@pytest.mark.asyncio
async def test_admin_create_variant(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    listed = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?status=active",
        headers={"Authorization": f"Bearer {token}"},
    )
    product_id = listed.json()["items"][0]["id"]

    response = await admin_catalog_client.post(
        f"/api/v1/admin/catalog/products/{product_id}/variants",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "sku": "VARIANT-EXTRA-1",
            "name": "Large size",
            "price_cents": 1200,
            "sort_order": 1,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["sku"] == "VARIANT-EXTRA-1"
    assert data["name"] == "Large size"


@pytest.mark.asyncio
async def test_admin_create_category_with_parent(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    parent = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"slug": "parent-cat", "name": "Parent Category", "sort_order": 1},
    )
    assert parent.status_code == 201
    parent_id = parent.json()["id"]

    child = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "slug": "child-cat",
            "name": "Child Category",
            "parent_id": parent_id,
            "sort_order": 2,
        },
    )
    assert child.status_code == 201
    assert child.json()["parent_id"] == parent_id


@pytest.mark.asyncio
async def test_admin_upload_media(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    response = await admin_catalog_client.post(
        "/api/v1/admin/media/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test.png", png_header, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert data["url"].endswith(".png")
