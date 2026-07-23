"""Admin catalog API tests."""

import uuid

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.admin.infrastructure.persistence.models import AdminUserModel
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.integrations.moysklad.infrastructure.persistence.models import ProductImageModel
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel
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
            multicolor_id = uuid.uuid4()
            variant_multicam_id = uuid.uuid4()
            variant_coyote_id = uuid.uuid4()
            session.add(
                ProductModel(
                    id=multicolor_id,
                    name="Multi Color Jacket",
                    slug="multi-color-jacket",
                    price_cents=5000,
                    currency="RUB",
                    in_stock=True,
                    status="active",
                    sync_source="moysklad",
                )
            )
            await session.flush()
            session.add_all(
                [
                    ProductVariantModel(
                        id=variant_multicam_id,
                        product_id=multicolor_id,
                        sku="MC-MULTICAM-M",
                        name="Multicam M",
                        price_cents=5000,
                        in_stock=True,
                        is_default=True,
                        sort_order=0,
                        attributes={"color": "Multicam", "size": "M"},
                    ),
                    ProductVariantModel(
                        id=variant_coyote_id,
                        product_id=multicolor_id,
                        sku="MC-COYOTE-M",
                        name="Coyote M",
                        price_cents=5000,
                        in_stock=True,
                        is_default=False,
                        sort_order=1,
                        attributes={"color": "Coyote", "size": "M"},
                    ),
                ]
            )
            session.add_all(
                [
                    InventoryItemModel(
                        variant_id=variant_multicam_id,
                        quantity_on_hand=12,
                        quantity_reserved=2,
                    ),
                    InventoryItemModel(
                        variant_id=variant_coyote_id,
                        quantity_on_hand=5,
                        quantity_reserved=0,
                    ),
                ]
            )
            session.add(
                ProductImageModel(
                    product_id=multicolor_id,
                    url="https://cdn.example.com/multicam-only.jpg",
                    sort_order=0,
                    option_color="Multicam",
                )
            )
            ballistic_id = uuid.uuid4()
            ballistic_variant_id = uuid.uuid4()
            session.add(
                ProductModel(
                    id=ballistic_id,
                    name="Ballistic Vest",
                    slug="ballistic-vest",
                    price_cents=345000,
                    currency="RUB",
                    in_stock=True,
                    status="draft",
                    sync_source="moysklad",
                )
            )
            await session.flush()
            session.add(
                ProductVariantModel(
                    id=ballistic_variant_id,
                    product_id=ballistic_id,
                    sku="BALLISTIC-1",
                    name="Default",
                    price_cents=345000,
                    in_stock=True,
                    is_default=True,
                    sort_order=0,
                )
            )
            session.add(
                InventoryItemModel(
                    variant_id=ballistic_variant_id,
                    quantity_on_hand=4,
                    quantity_reserved=0,
                )
            )
            ms_draft_id = uuid.uuid4()
            session.add(
                ProductModel(
                    id=ms_draft_id,
                    name="MS Draft For Publish",
                    slug="ms-draft-publish",
                    price_cents=3000,
                    currency="RUB",
                    in_stock=True,
                    status="draft",
                    sync_source="moysklad",
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
async def test_admin_create_product_returns_403_moysklad_only(admin_catalog_client: AsyncClient) -> None:
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
    assert response.status_code == 403
    assert "МойСклад" in response.json()["detail"]


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
async def test_admin_catalog_overview(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.get(
        "/api/v1/admin/catalog/overview",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert data["uncategorized"] == 3
    assert data["needs_styling"] == 2
    assert data["needs_color_photos"] == 1
    assert data["ready_to_publish"] == 0
    assert data["draft"] == 2
    assert data["active"] == 1
    assert data["archived"] == 0


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
async def test_admin_archive_demo_product_with_relative_image_url(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)
    demo_id = uuid.uuid4()

    override = app.dependency_overrides[get_db_session]
    async for session in override():
        session.add(
            ProductModel(
                id=demo_id,
                name="Classic White T-Shirt",
                slug="classic-white-t-shirt",
                price_cents=2999,
                compare_at_price_cents=3999,
                currency="RUB",
                in_stock=True,
                status="active",
                sync_source="manual",
                image_url="/images/product-placeholder.svg",
            )
        )
        await session.commit()
        break

    response = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{demo_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Classic White T-Shirt",
            "slug": "classic-white-t-shirt",
            "price_cents": 2999,
            "compare_at_price_cents": 3999,
            "currency": "RUB",
            "status": "archived",
            "image_url": "/images/product-placeholder.svg",
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "archived"


@pytest.mark.asyncio
async def test_admin_create_duplicate_slug_returns_403(admin_catalog_client: AsyncClient) -> None:
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
    assert response.status_code == 403


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
async def test_admin_create_product_with_wholesale_price_returns_403(
    admin_catalog_client: AsyncClient,
) -> None:
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
    assert response.status_code == 403


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
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_create_product_with_content_fields_returns_403(
    admin_catalog_client: AsyncClient,
) -> None:
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
    assert response.status_code == 403


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
async def test_admin_delete_category_with_children_returns_422(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)
    root = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"slug": "root-delete-test", "name": "Root Delete Test"},
    )
    assert root.status_code == 201
    root_id = root.json()["id"]

    child = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "slug": "child-delete-test",
            "name": "Child Delete Test",
            "parent_id": root_id,
        },
    )
    assert child.status_code == 201

    delete_root = await admin_catalog_client.delete(
        f"/api/v1/admin/catalog/categories/{root_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_root.status_code == 422
    assert "подкатегори" in delete_root.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_delete_leaf_category(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    created = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"slug": "leaf-delete-test", "name": "Leaf Delete Test"},
    )
    assert created.status_code == 201
    category_id = created.json()["id"]

    deleted = await admin_catalog_client.delete(
        f"/api/v1/admin/catalog/categories/{category_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_admin_search_products_by_name(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?q=draft-product",
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
async def test_admin_rejects_subcategory_as_parent(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    root = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"slug": "root-for-nesting", "name": "Root", "sort_order": 1},
    )
    assert root.status_code == 201
    root_id = root.json()["id"]

    child = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "slug": "child-for-nesting",
            "name": "Child",
            "parent_id": root_id,
            "sort_order": 2,
        },
    )
    assert child.status_code == 201
    child_id = child.json()["id"]

    nested = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "slug": "nested-cat",
            "name": "Nested",
            "parent_id": child_id,
            "sort_order": 3,
        },
    )
    assert nested.status_code == 422


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
    assert data["url"].startswith("/media/")
    assert data["url"].endswith(".png")

    served = await admin_catalog_client.get(data["url"])
    assert served.status_code == 200
    assert served.content.startswith(b"\x89PNG")


@pytest.mark.asyncio
async def test_admin_upload_media_sniffs_png_when_mime_is_wrong(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)
    png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    response = await admin_catalog_client.post(
        "/api/v1/admin/media/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("photo.jpg", png_header, "image/jpeg")},
    )
    assert response.status_code == 200
    url = response.json()["url"]
    assert url.startswith("/media/")
    assert url.endswith(".png")


@pytest.mark.asyncio
async def test_admin_upload_media_rejects_video(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)
    mp4_header = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64
    response = await admin_catalog_client.post(
        "/api/v1/admin/media/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("clip.mp4", mp4_header, "video/mp4")},
    )
    assert response.status_code == 422
    assert "Video files are not supported" in response.json()["detail"]


@pytest.mark.asyncio
async def test_admin_upload_media_does_not_leak_internal_error(
    admin_catalog_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.features.admin.infrastructure.media.storage import MediaStorageError, MediaStorageService

    def _raise_internal(_self, _data: bytes, _content_type: str) -> str:
        raise MediaStorageError("disk full at /secret/path/uploads")

    monkeypatch.setattr(MediaStorageService, "store_bytes", _raise_internal)
    token = await _token(admin_catalog_client)
    png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    response = await admin_catalog_client.post(
        "/api/v1/admin/media/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("photo.png", png_header, "image/png")},
    )
    assert response.status_code == 500
    assert response.json()["detail"] == "Media upload failed"
    assert "/secret/" not in response.json()["detail"]


@pytest.mark.asyncio
async def test_admin_list_products_filter_by_category(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)

    category = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "slug": "filter-test-cat",
            "name": "Filter Test Category",
            "sort_order": 1,
        },
    )
    assert category.status_code == 201
    category_id = category.json()["id"]

    listed = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?status=active",
        headers={"Authorization": f"Bearer {token}"},
    )
    product_id = listed.json()["items"][0]["id"]

    assigned = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"category_id": category_id},
    )
    assert assigned.status_code == 200

    filtered = await admin_catalog_client.get(
        f"/api/v1/admin/catalog/products?category_id={category_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert filtered.status_code == 200
    slugs = {item["slug"] for item in filtered.json()["items"]}
    assert "visible-product" in slugs
    assert "draft-product" not in slugs

    uncategorized = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?uncategorized=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert uncategorized.status_code == 200
    uncategorized_slugs = {item["slug"] for item in uncategorized.json()["items"]}
    assert "visible-product" not in uncategorized_slugs
    assert "draft-product" in uncategorized_slugs


@pytest.mark.asyncio
async def test_admin_product_image_option_color(admin_catalog_client: AsyncClient) -> None:
    token = await _token(admin_catalog_client)

    listing = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert listing.status_code == 200
    product_id = listing.json()["items"][0]["id"]

    created = await admin_catalog_client.post(
        f"/api/v1/admin/catalog/products/{product_id}/images",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "url": "https://cdn.example.com/gallery/multicam.jpg",
            "option_color": "Multicam",
            "sort_order": 0,
        },
    )
    assert created.status_code == 201
    image = created.json()
    assert image["option_color"] == "Multicam"

    updated = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/images/{image['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"option_color": "Coyote"},
    )
    assert updated.status_code == 200
    assert updated.json()["option_color"] == "Coyote"

    detail = await admin_catalog_client.get(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail.status_code == 200
    images = detail.json()["images"]
    assert any(item["id"] == image["id"] and item["option_color"] == "Coyote" for item in images)


@pytest.mark.asyncio
async def test_admin_list_products_needs_color_photos_filter(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)

    filtered = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?needs_color_photos=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert filtered.status_code == 200
    payload = filtered.json()
    assert payload["total"] >= 1
    match = next(item for item in payload["items"] if item["slug"] == "multi-color-jacket")

    covered = await admin_catalog_client.post(
        f"/api/v1/admin/catalog/products/{match['id']}/images",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "url": "https://cdn.example.com/coyote.jpg",
            "option_color": "Coyote",
            "sort_order": 1,
        },
    )
    assert covered.status_code == 201

    filtered_after = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?needs_color_photos=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert filtered_after.status_code == 200
    slugs = [item["slug"] for item in filtered_after.json()["items"]]
    assert "multi-color-jacket" not in slugs


@pytest.mark.asyncio
async def test_admin_update_moysklad_product_allows_display_fields(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)

    listing = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?q=multi-color-jacket",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert listing.status_code == 200
    product_id = listing.json()["items"][0]["id"]

    response = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Multi Color Jacket Updated",
            "slug": "multi-color-jacket",
            "meta_title": "Updated meta title",
            "meta_description": "Updated meta description",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "Multi Color Jacket Updated"
    assert payload["meta_title"] == "Updated meta title"
    assert payload["meta_description"] == "Updated meta description"


@pytest.mark.asyncio
async def test_admin_update_moysklad_product_blocks_currency_with_422(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)

    listing = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?q=multi-color-jacket",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert listing.status_code == 200
    product_id = listing.json()["items"][0]["id"]

    response = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"currency": "RUB"},
    )
    assert response.status_code == 422
    assert "МойСклад" in response.json()["detail"]


@pytest.mark.asyncio
async def test_admin_publish_moysklad_product_requires_merchandising(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)

    category = await admin_catalog_client.post(
        "/api/v1/admin/catalog/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "slug": "publish-guard-cat",
            "name": "Publish Guard Category",
            "sort_order": 1,
        },
    )
    assert category.status_code == 201
    category_id = category.json()["id"]

    listing = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?q=ms-draft-publish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert listing.status_code == 200
    product_id = listing.json()["items"][0]["id"]

    assigned = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"category_id": category_id},
    )
    assert assigned.status_code == 200

    blocked = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "active"},
    )
    assert blocked.status_code == 422
    assert "нет фото" in blocked.json()["detail"]

    with_photo = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"image_url": "https://cdn.example.com/ms-draft.jpg"},
    )
    assert with_photo.status_code == 200

    published = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "active"},
    )
    assert published.status_code == 200
    assert published.json()["status"] == "active"


@pytest.mark.asyncio
async def test_admin_publish_moysklad_multicolor_requires_all_color_photos(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)

    listing = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?q=multi-color-jacket",
        headers={"Authorization": f"Bearer {token}"},
    )
    product_id = listing.json()["items"][0]["id"]

    draft = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "draft"},
    )
    assert draft.status_code == 200

    blocked = await admin_catalog_client.patch(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "active"},
    )
    assert blocked.status_code == 422
    assert "не все цвета" in blocked.json()["detail"]


@pytest.mark.asyncio
async def test_admin_list_products_includes_moysklad_stock_totals(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?q=multi-color-jacket",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    product = response.json()["items"][0]
    assert product["stock_available_total"] == 15
    assert product["stock_quantity_on_hand_total"] == 17
    assert product["is_low_stock"] is False

    variants = {variant["sku"]: variant for variant in product["variants"]}
    assert variants["MC-MULTICAM-M"]["quantity_on_hand"] == 12
    assert variants["MC-MULTICAM-M"]["quantity_reserved"] == 2
    assert variants["MC-MULTICAM-M"]["available"] == 10
    assert variants["MC-COYOTE-M"]["available"] == 5


@pytest.mark.asyncio
async def test_admin_list_products_stock_total_is_per_product_not_page_sum(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)
    response = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?sync_source=moysklad&limit=20",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    by_slug = {item["slug"]: item for item in response.json()["items"]}
    assert by_slug["multi-color-jacket"]["stock_available_total"] == 15
    assert by_slug["ballistic-vest"]["stock_available_total"] == 4


@pytest.mark.asyncio
async def test_admin_get_product_includes_variant_stock(
    admin_catalog_client: AsyncClient,
) -> None:
    token = await _token(admin_catalog_client)
    listed = await admin_catalog_client.get(
        "/api/v1/admin/catalog/products?q=multi-color-jacket",
        headers={"Authorization": f"Bearer {token}"},
    )
    product_id = listed.json()["items"][0]["id"]

    response = await admin_catalog_client.get(
        f"/api/v1/admin/catalog/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["stock_available_total"] == 15
    assert all("available" in variant for variant in data["variants"])
