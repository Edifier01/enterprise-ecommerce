"""Wholesale pricing API tests (ADR-008)."""

import uuid
from collections.abc import AsyncGenerator

import pytest
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from tests.auth_helpers import mark_user_email_verified
from tests.auth_payloads import retail_register_payload

from app.core.config import settings
from app.core.database import Base, get_db_session
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.checkout.infrastructure.persistence.models import OrderLineModel, OrderModel
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

_PRODUCT_ID = uuid.uuid4()
_VARIANT_ID = uuid.uuid4()
_RETAIL_CENTS = 2500
_WHOLESALE_CENTS = 2000


def _seed_wholesale_catalog() -> tuple[ProductModel, ProductVariantModel, InventoryItemModel]:
    product = ProductModel(
        id=_PRODUCT_ID,
        name="Wholesale Test Product",
        slug="wholesale-test-product",
        price_cents=_RETAIL_CENTS,
        currency="USD",
        in_stock=True,
        status="active",
    )
    variant = ProductVariantModel(
        id=_VARIANT_ID,
        product_id=_PRODUCT_ID,
        sku="WHOLESALE-TEST-SKU",
        name="Default",
        attributes={},
        price_cents=_RETAIL_CENTS,
        wholesale_price_cents=_WHOLESALE_CENTS,
        in_stock=True,
        is_default=True,
        sort_order=0,
    )
    inventory = InventoryItemModel(
        id=_VARIANT_ID,
        variant_id=_VARIANT_ID,
        quantity_on_hand=20,
        quantity_reserved=0,
        version=0,
    )
    return product, variant, inventory


@pytest.fixture
async def wholesale_client() -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    product, variant, inventory = _seed_wholesale_catalog()
    async with session_factory() as session:
        session.add(product)
        session.add(variant)
        session.add(inventory)
        await session.commit()

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
async def wholesale_client_with_db() -> AsyncGenerator[
    tuple[AsyncClient, async_sessionmaker], None
]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    product, variant, inventory = _seed_wholesale_catalog()
    async with session_factory() as session:
        session.add(product)
        session.add(variant)
        session.add(inventory)
        await session.commit()

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, session_factory
    app.dependency_overrides.clear()
    await engine.dispose()


async def _register_and_login(
    client: AsyncClient,
    session_factory: async_sessionmaker,
    email: str,
) -> str:
    await client.post(
        "/api/v1/auth/register",
        json=retail_register_payload(email),
    )
    await mark_user_email_verified(session_factory, email)
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "secret123"},
    )
    return login.json()["access_token"]


async def _grant_wholesaler(
    client: AsyncClient,
    session_factory: async_sessionmaker,
    email: str,
) -> str:
    token = await _register_and_login(client, session_factory, email)
    async with session_factory() as session:
        await session.execute(
            sa.text("UPDATE users SET is_wholesaler = 1 WHERE email = :email"),
            {"email": email},
        )
        await session.commit()
    return token


@pytest.mark.asyncio
async def test_retail_catalog_hides_wholesale_price(wholesale_client: AsyncClient) -> None:
    response = await wholesale_client.get("/api/v1/products/wholesale-test-product")
    assert response.status_code == 200
    variant = response.json()["variants"][0]
    assert variant["price_cents"] == _RETAIL_CENTS
    assert "wholesale_price_cents" not in variant


@pytest.mark.asyncio
async def test_wholesaler_catalog_shows_wholesale_price(wholesale_client_with_db) -> None:
    client, session_factory = wholesale_client_with_db
    token = await _grant_wholesaler(client, session_factory, "wholesaler@example.com")

    response = await client.get(
        "/api/v1/products/wholesale-test-product",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    variant = response.json()["variants"][0]
    assert variant["price_cents"] == _RETAIL_CENTS
    assert variant["wholesale_price_cents"] == _WHOLESALE_CENTS


@pytest.mark.asyncio
async def test_retail_cart_uses_retail_price(wholesale_client: AsyncClient) -> None:
    response = await wholesale_client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    assert response.status_code == 200
    line = response.json()["lines"][0]
    assert line["unit_price_cents"] == _RETAIL_CENTS
    assert line["product_snapshot"]["price_tier"] == "retail"


@pytest.mark.asyncio
async def test_wholesaler_cart_uses_wholesale_price(wholesale_client_with_db) -> None:
    client, session_factory = wholesale_client_with_db
    token = await _grant_wholesaler(client, session_factory, "cart-wholesale@example.com")

    response = await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    line = response.json()["lines"][0]
    assert line["unit_price_cents"] == _WHOLESALE_CENTS
    assert line["product_snapshot"]["price_tier"] == "wholesale"
    assert response.json()["subtotal_cents"] == _WHOLESALE_CENTS * 2


@pytest.mark.asyncio
async def test_me_exposes_is_wholesaler(wholesale_client_with_db) -> None:
    client, session_factory = wholesale_client_with_db
    token = await _grant_wholesaler(client, session_factory, "me-wholesale@example.com")

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["is_wholesaler"] is True


@pytest.mark.asyncio
async def test_wholesaler_checkout_order_at_wholesale_price(
    wholesale_client_with_db,
) -> None:
    original_provider = settings.payment_provider
    settings.payment_provider = "stub"

    client, session_factory = wholesale_client_with_db
    token = await _grant_wholesaler(client, session_factory, "checkout-wholesale@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    try:
        await client.post(
            "/api/v1/cart/lines",
            json={"variant_id": str(_VARIANT_ID), "quantity": 2},
            headers=headers,
        )
        session_resp = await client.post(
            "/api/v1/checkout/sessions",
            headers={**headers, "Idempotency-Key": "wholesale-checkout-session"},
        )
        assert session_resp.status_code == 201
        assert session_resp.json()["total_cents"] == _WHOLESALE_CENTS * 2

        session_id = session_resp.json()["id"]
        pi_resp = await client.post(
            f"/api/v1/checkout/sessions/{session_id}/payment-intent",
            headers={**headers, "Idempotency-Key": "wholesale-pi"},
        )
        payment_intent_id = pi_resp.json()["payment_intent_id"]

        simulate_resp = await client.post(
            f"/api/v1/dev/payments/{payment_intent_id}/simulate-success",
        )
        assert simulate_resp.status_code == 200

        async with session_factory() as session:
            order = (await session.execute(select(OrderModel))).scalar_one()
            assert order.total_cents == _WHOLESALE_CENTS * 2
            line = (await session.execute(select(OrderLineModel))).scalar_one()
            assert line.unit_price_cents == _WHOLESALE_CENTS
            snapshot = line.product_snapshot
            assert snapshot["price_tier"] == "wholesale"
    finally:
        settings.payment_provider = original_provider


@pytest.mark.asyncio
async def test_retail_product_list_hides_wholesale(wholesale_client: AsyncClient) -> None:
    response = await wholesale_client.get("/api/v1/products")
    assert response.status_code == 200
    variant = response.json()["items"][0]["variants"][0]
    assert "wholesale_price_cents" not in variant


@pytest.mark.asyncio
async def test_wholesaler_product_list_shows_wholesale(wholesale_client_with_db) -> None:
    client, session_factory = wholesale_client_with_db
    token = await _grant_wholesaler(client, session_factory, "list-wholesale@example.com")

    response = await client.get(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    variant = response.json()["items"][0]["variants"][0]
    assert variant["wholesale_price_cents"] == _WHOLESALE_CENTS


@pytest.mark.asyncio
async def test_retail_search_hides_wholesale(wholesale_client: AsyncClient) -> None:
    response = await wholesale_client.get("/api/v1/products/search?q=Wholesale+Test")
    assert response.status_code == 200
    assert response.json()["total"] >= 1
    variant = response.json()["items"][0]["variants"][0]
    assert "wholesale_price_cents" not in variant


@pytest.mark.asyncio
async def test_wholesaler_missing_wholesale_price_returns_409(wholesale_client_with_db) -> None:
    client, session_factory = wholesale_client_with_db
    token = await _grant_wholesaler(client, session_factory, "no-wholesale@example.com")

    async with session_factory() as session:
        await session.execute(
            sa.text(
                "UPDATE product_variants SET wholesale_price_cents = NULL WHERE id = :id"
            ),
            {"id": _VARIANT_ID.hex},
        )
        await session.commit()

    response = await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_revalidates_guest_cart_to_wholesale(wholesale_client_with_db) -> None:
    client, session_factory = wholesale_client_with_db
    email = "merge-wholesale@example.com"
    await client.post(
        "/api/v1/auth/register",
        json=retail_register_payload(email),
    )
    await mark_user_email_verified(session_factory, email)
    async with session_factory() as session:
        await session.execute(
            sa.text("UPDATE users SET is_wholesaler = 1 WHERE email = :email"),
            {"email": email},
        )
        await session.commit()

    guest_cart = await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    assert guest_cart.status_code == 200
    assert guest_cart.json()["lines"][0]["unit_price_cents"] == _RETAIL_CENTS

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "secret123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    cart = await client.get(
        "/api/v1/cart",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cart.status_code == 200
    assert cart.json()["lines"][0]["unit_price_cents"] == _WHOLESALE_CENTS
    assert cart.json()["lines"][0]["product_snapshot"]["price_tier"] == "wholesale"
