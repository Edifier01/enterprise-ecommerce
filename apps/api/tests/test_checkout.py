"""Checkout API tests — cart, checkout session, payment intent, webhooks."""

import json
import uuid
from collections.abc import AsyncGenerator

from tests.auth_helpers import mark_user_email_verified
from tests.auth_payloads import retail_register_payload
from tests.checkout_helpers import RETAIL_SHIPPING_JSON

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db_session
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.checkout.domain.entities import PaymentIntentResult
from app.features.checkout.domain.ports import IStripeGateway
from app.features.checkout.infrastructure.persistence.models import OrderLineModel, OrderModel
from app.features.checkout.presentation.dependencies import get_stripe_gateway
from app.features.inventory.infrastructure.persistence.models import (
    InventoryItemModel,
    InventoryReservationModel,
)
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

_PRODUCT_ID = uuid.uuid4()
_VARIANT_ID = uuid.uuid4()
_FAKE_PI_ID = "pi_test_fake_123"
_FAKE_CLIENT_SECRET = "pi_test_fake_123_secret_xyz"


class FakeStripeGateway(IStripeGateway):
    def __init__(self) -> None:
        self._secrets: dict[str, str] = {}

    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str,
        idempotency_key: str,
        metadata: dict[str, str],
    ) -> PaymentIntentResult:
        pi_id = _FAKE_PI_ID
        secret = _FAKE_CLIENT_SECRET
        self._secrets[pi_id] = secret
        return PaymentIntentResult(payment_intent_id=pi_id, client_secret=secret)

    async def retrieve_client_secret(self, payment_intent_id: str) -> str:
        return self._secrets.get(payment_intent_id, _FAKE_CLIENT_SECRET)

    def construct_webhook_event(
        self, payload: bytes, signature_header: str | None
    ) -> dict:
        return json.loads(payload)


def _seed_product_and_variant() -> tuple[ProductModel, ProductVariantModel, InventoryItemModel]:
    product = ProductModel(
        id=_PRODUCT_ID,
        name="Test Product",
        slug="test-product",
        price_cents=2500,
        currency="USD",
        in_stock=True,
    )
    variant = ProductVariantModel(
        id=_VARIANT_ID,
        product_id=_PRODUCT_ID,
        sku="TEST-SKU-1",
        name="Default",
        attributes={},
        price_cents=2500,
        in_stock=True,
        is_default=True,
        sort_order=0,
    )
    inventory = InventoryItemModel(
        id=_VARIANT_ID,
        variant_id=_VARIANT_ID,
        quantity_on_hand=10,
        quantity_reserved=0,
        version=0,
    )
    return product, variant, inventory


def _payment_succeeded_event(
    payment_intent_id: str,
    event_id: str,
    *,
    amount_cents: int = 2500,
    currency: str = "usd",
) -> dict:
    return {
        "id": event_id,
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": payment_intent_id,
                "amount": amount_cents,
                "amount_received": amount_cents,
                "currency": currency,
                "latest_charge": "ch_test_123",
                "payment_method": "pm_test",
                "payment_method_types": ["card"],
            }
        },
    }


def _payment_failed_event(payment_intent_id: str, event_id: str) -> dict:
    return {
        "id": event_id,
        "type": "payment_intent.payment_failed",
        "data": {
            "object": {
                "id": payment_intent_id,
                "last_payment_error": {
                    "code": "card_declined",
                    "message": "Card was declined",
                },
            }
        },
    }


@pytest.fixture
async def checkout_client() -> AsyncGenerator[AsyncClient, None]:
    settings.stripe_secret_key = type(settings.stripe_secret_key)("sk_test_fake")  # type: ignore[misc]
    settings.stripe_webhook_secret = type(settings.stripe_webhook_secret)("whsec_test_fake")  # type: ignore[misc]

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    product, variant, inventory = _seed_product_and_variant()
    async with session_factory() as session:
        session.add(product)
        session.add(variant)
        session.add(inventory)
        await session.commit()

    fake_gateway = FakeStripeGateway()

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_stripe_gateway] = lambda: fake_gateway

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
async def checkout_client_with_db() -> AsyncGenerator[
    tuple[AsyncClient, async_sessionmaker], None
]:
    settings.stripe_secret_key = type(settings.stripe_secret_key)("sk_test_fake")  # type: ignore[misc]
    settings.stripe_webhook_secret = type(settings.stripe_webhook_secret)("whsec_test_fake")  # type: ignore[misc]

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    product, variant, inventory = _seed_product_and_variant()
    async with session_factory() as session:
        session.add(product)
        session.add(variant)
        session.add(inventory)
        await session.commit()

    fake_gateway = FakeStripeGateway()

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_stripe_gateway] = lambda: fake_gateway

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, session_factory
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_get_cart_creates_guest_cart_with_cookie(checkout_client: AsyncClient) -> None:
    response = await checkout_client.get("/api/v1/cart")
    assert response.status_code == 200
    data = response.json()
    assert data["lines"] == []
    assert data["subtotal_cents"] == 0
    assert "cart_session_id" in response.cookies


@pytest.mark.asyncio
async def test_add_to_cart(checkout_client: AsyncClient) -> None:
    response = await checkout_client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 2},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["lines"]) == 1
    assert data["lines"][0]["quantity"] == 2
    assert data["lines"][0]["unit_price_cents"] == 2500
    assert data["subtotal_cents"] == 5000
    assert data["lines"][0]["product_snapshot"]["sku"] == "TEST-SKU-1"


@pytest.mark.asyncio
async def test_create_checkout_session(checkout_client: AsyncClient) -> None:
    await checkout_client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    response = await checkout_client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-1"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["subtotal_cents"] == 2500
    assert data["total_cents"] == 2500
    assert data["currency"] == "USD"
    assert data["status"] == "open"


@pytest.mark.asyncio
async def test_create_checkout_session_requires_shipping_for_retail(
    checkout_client: AsyncClient,
) -> None:
    await checkout_client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    response = await checkout_client.post(
        "/api/v1/checkout/sessions",
        headers={"Idempotency-Key": "checkout-key-no-shipping"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_checkout_session_reserves_inventory(
    checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 3},
    )
    response = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-reserve"},
    )
    assert response.status_code == 201
    session_id = response.json()["id"]

    async with session_factory() as session:
        item = (
            await session.execute(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == _VARIANT_ID)
            )
        ).scalar_one()
        assert item.quantity_on_hand == 10
        assert item.quantity_reserved == 3

        reservations = (
            await session.execute(select(InventoryReservationModel))
        ).scalars().all()
        assert len(reservations) == 1
        assert reservations[0].reference_id == uuid.UUID(session_id)
        assert reservations[0].status == "active"


@pytest.mark.asyncio
async def test_checkout_session_insufficient_inventory_returns_409(
    checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 2},
    )

    async with session_factory() as session:
        item = (
            await session.execute(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == _VARIANT_ID)
            )
        ).scalar_one()
        item.quantity_on_hand = 1
        await session.commit()

    response = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-insufficient"},
    )
    assert response.status_code == 409
    assert "Insufficient stock" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_payment_intent_with_fake_gateway(checkout_client: AsyncClient) -> None:
    await checkout_client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    session_resp = await checkout_client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-2"},
    )
    session_id = session_resp.json()["id"]

    response = await checkout_client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "pi-key-1"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["payment_intent_id"] == _FAKE_PI_ID
    assert data["client_secret"] == _FAKE_CLIENT_SECRET


@pytest.mark.asyncio
async def test_payment_failed_releases_inventory_reservation(
    checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 2},
    )
    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-failed-release"},
    )
    session_id = session_resp.json()["id"]
    await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "pi-key-failed-release"},
    )

    event = _payment_failed_event(_FAKE_PI_ID, "evt_test_failed_release")
    webhook_resp = await client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(event),
        headers={"Stripe-Signature": "fake_sig"},
    )
    assert webhook_resp.status_code == 200

    async with session_factory() as session:
        inventory = await session.get(InventoryItemModel, _VARIANT_ID)
        assert inventory is not None
        assert inventory.quantity_on_hand == 10
        assert inventory.quantity_reserved == 0

        reservations = (
            await session.execute(select(InventoryReservationModel))
        ).scalars().all()
        assert len(reservations) == 1
        assert reservations[0].status == "released"


@pytest.mark.asyncio
async def test_order_not_created_before_webhook(
    checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-3"},
    )
    session_id = session_resp.json()["id"]
    await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "pi-key-2"},
    )

    async with session_factory() as session:
        result = await session.execute(select(OrderModel))
        orders = result.scalars().all()
        assert len(orders) == 0

    status_resp = await client.get(f"/api/v1/checkout/sessions/{session_id}")
    assert status_resp.json()["order_number"] is None


@pytest.mark.asyncio
async def test_webhook_success_creates_order(checkout_client_with_db: tuple) -> None:
    client, session_factory = checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 2},
    )
    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-4"},
    )
    session_id = session_resp.json()["id"]
    await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "pi-key-3"},
    )

    event = _payment_succeeded_event(_FAKE_PI_ID, "evt_test_1", amount_cents=5000)
    webhook_resp = await client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(event),
        headers={"Stripe-Signature": "fake_sig"},
    )
    assert webhook_resp.status_code == 200
    assert webhook_resp.json()["status"] == "processed"

    status_resp = await client.get(f"/api/v1/checkout/sessions/{session_id}")
    assert status_resp.json()["order_number"] is not None
    assert status_resp.json()["status"] == "completed"

    async with session_factory() as session:
        result = await session.execute(select(OrderModel))
        orders = result.scalars().all()
        assert len(orders) == 1
        assert orders[0].total_cents == 5000

        inventory = await session.get(InventoryItemModel, _VARIANT_ID)
        assert inventory is not None
        assert inventory.quantity_on_hand == 8
        assert inventory.quantity_reserved == 0

        reservations = (
            await session.execute(select(InventoryReservationModel))
        ).scalars().all()
        assert len(reservations) == 1
        assert reservations[0].status == "committed"


@pytest.mark.asyncio
async def test_duplicate_webhook_is_idempotent(checkout_client_with_db: tuple) -> None:
    client, session_factory = checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-5"},
    )
    session_id = session_resp.json()["id"]
    await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "pi-key-4"},
    )

    event = _payment_succeeded_event(_FAKE_PI_ID, "evt_test_dup", amount_cents=2500)
    for _ in range(2):
        resp = await client.post(
            "/api/v1/webhooks/stripe",
            content=json.dumps(event),
            headers={"Stripe-Signature": "fake_sig"},
        )
        assert resp.status_code == 200

    async with session_factory() as session:
        result = await session.execute(select(OrderModel))
        orders = result.scalars().all()
        assert len(orders) == 1
        inventory = await session.get(InventoryItemModel, _VARIANT_ID)
        assert inventory is not None
        assert inventory.quantity_on_hand == 9
        assert inventory.quantity_reserved == 0

    second_resp = await client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(event),
        headers={"Stripe-Signature": "fake_sig"},
    )
    assert second_resp.json()["status"] == "already_processed"


@pytest.mark.asyncio
async def test_order_uses_frozen_lines_after_cart_mutation(
    checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    """Cart changes after PaymentIntent must not affect webhook-created order."""
    client, session_factory = checkout_client_with_db
    add_resp = await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 2},
    )
    line_id = add_resp.json()["lines"][0]["id"]

    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-frozen"},
    )
    session_id = session_resp.json()["id"]
    await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "pi-key-frozen"},
    )

    await client.patch(
        f"/api/v1/cart/lines/{line_id}",
        json={"quantity": 10},
    )

    event = _payment_succeeded_event(_FAKE_PI_ID, "evt_test_frozen", amount_cents=5000)
    webhook_resp = await client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(event),
        headers={"Stripe-Signature": "fake_sig"},
    )
    assert webhook_resp.status_code == 200
    assert webhook_resp.json()["status"] == "processed"

    async with session_factory() as session:
        orders = (await session.execute(select(OrderModel))).scalars().all()
        assert len(orders) == 1
        assert orders[0].total_cents == 5000

        order_lines = (
            await session.execute(
                select(OrderLineModel).where(OrderLineModel.order_id == orders[0].id)
            )
        ).scalars().all()
        assert len(order_lines) == 1
        assert order_lines[0].quantity == 2
        assert order_lines[0].line_total_cents == 5000


@pytest.mark.asyncio
async def test_payment_intent_rejects_foreign_checkout_session(
    checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    """PaymentIntent creation for another guest's session returns 404."""
    client, _ = checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-foreign"},
    )
    session_id = session_resp.json()["id"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as other_client:
        response = await other_client.post(
            f"/api/v1/checkout/sessions/{session_id}/payment-intent",
            headers={"Idempotency-Key": "pi-key-foreign"},
        )
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_webhook_amount_mismatch_does_not_create_order(
    checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 2},
    )
    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-mismatch"},
    )
    session_id = session_resp.json()["id"]
    await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "pi-key-mismatch"},
    )

    event = _payment_succeeded_event(
        _FAKE_PI_ID,
        "evt_test_mismatch",
        amount_cents=100,
        currency="usd",
    )
    webhook_resp = await client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(event),
        headers={"Stripe-Signature": "fake_sig"},
    )
    assert webhook_resp.status_code == 200
    assert webhook_resp.json()["status"] == "processed"

    status_resp = await client.get(f"/api/v1/checkout/sessions/{session_id}")
    assert status_resp.json()["order_number"] is None

    async with session_factory() as session:
        orders = (await session.execute(select(OrderModel))).scalars().all()
        assert len(orders) == 0


@pytest.mark.asyncio
async def test_checkout_uses_access_token_cookie_for_authenticated_cart(
    checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = checkout_client_with_db
    await client.post(
        "/api/v1/auth/register",
        json=retail_register_payload("checkout-user@example.com"),
    )
    await mark_user_email_verified(session_factory, "checkout-user@example.com")
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "checkout-user@example.com", "password": "secret123"},
    )
    token = login_response.json()["access_token"]
    client.cookies.set("access_token", token)

    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-auth-cookie"},
    )
    session_id = session_resp.json()["id"]
    await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "pi-key-auth-cookie"},
    )

    event = _payment_succeeded_event(_FAKE_PI_ID, "evt_test_auth_cookie")
    webhook_resp = await client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(event),
        headers={"Stripe-Signature": "fake_sig"},
    )
    assert webhook_resp.status_code == 200

    async with session_factory() as session:
        orders = (await session.execute(select(OrderModel))).scalars().all()
        assert len(orders) == 1
        assert orders[0].customer_id is not None


@pytest.mark.asyncio
async def test_checkout_session_refreshes_stale_cart_price(
    checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )

    async with session_factory() as session:
        variant = await session.get(ProductVariantModel, _VARIANT_ID)
        assert variant is not None
        variant.price_cents = 3000
        await session.commit()

    response = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-price-refresh"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["subtotal_cents"] == 3000
    assert data["total_cents"] == 3000

    cart_response = await client.get("/api/v1/cart")
    assert cart_response.json()["lines"][0]["unit_price_cents"] == 3000


@pytest.fixture
async def stub_checkout_client_with_db() -> AsyncGenerator[
    tuple[AsyncClient, async_sessionmaker], None
]:
    original_provider = settings.payment_provider
    original_stripe_key = settings.stripe_secret_key
    original_webhook_secret = settings.stripe_webhook_secret
    settings.payment_provider = "stub"
    settings.stripe_secret_key = type(settings.stripe_secret_key)("")  # type: ignore[misc]
    settings.stripe_webhook_secret = type(settings.stripe_webhook_secret)("")  # type: ignore[misc]

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    product, variant, inventory = _seed_product_and_variant()
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
    settings.payment_provider = original_provider
    settings.stripe_secret_key = original_stripe_key
    settings.stripe_webhook_secret = original_webhook_secret
    await engine.dispose()


@pytest.mark.asyncio
async def test_stub_payment_intent_without_stripe_keys(
    stub_checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, _ = stub_checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-stub-pi"},
    )
    session_id = session_resp.json()["id"]

    response = await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "pi-key-stub"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["payment_intent_id"].startswith("pi_stub_")
    assert data["client_secret"].endswith("_secret_stub")


@pytest.mark.asyncio
async def test_stub_simulate_success_creates_order(
    stub_checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, session_factory = stub_checkout_client_with_db
    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 2},
    )
    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        json=RETAIL_SHIPPING_JSON,
        headers={"Idempotency-Key": "checkout-key-stub-sim"},
    )
    session_id = session_resp.json()["id"]
    pi_resp = await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "pi-key-stub-sim"},
    )
    payment_intent_id = pi_resp.json()["payment_intent_id"]

    simulate_resp = await client.post(
        f"/api/v1/dev/payments/{payment_intent_id}/simulate-success",
    )
    assert simulate_resp.status_code == 200
    assert simulate_resp.json()["status"] == "processed"

    status_resp = await client.get(f"/api/v1/checkout/sessions/{session_id}")
    assert status_resp.json()["order_number"] is not None
    assert status_resp.json()["status"] == "completed"

    async with session_factory() as session:
        orders = (await session.execute(select(OrderModel))).scalars().all()
        assert len(orders) == 1
        assert orders[0].total_cents == 5000


@pytest.mark.asyncio
async def test_stub_simulate_success_forbidden_in_production(
    stub_checkout_client_with_db: tuple[AsyncClient, async_sessionmaker],
) -> None:
    client, _ = stub_checkout_client_with_db
    original_environment = settings.environment
    settings.environment = "production"
    try:
        response = await client.post("/api/v1/dev/payments/pi_stub_fake/simulate-success")
        assert response.status_code == 404
    finally:
        settings.environment = original_environment
