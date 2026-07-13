"""Customer order history API tests."""

import json
import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db_session
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.checkout.domain.entities import PaymentIntentResult
from app.features.checkout.domain.ports import IStripeGateway
from app.features.checkout.presentation.dependencies import get_stripe_gateway
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

_PRODUCT_ID = uuid.uuid4()
_VARIANT_ID = uuid.uuid4()
_FAKE_PI_ID = "pi_test_orders_123"
_FAKE_CLIENT_SECRET = "pi_test_orders_123_secret_xyz"


class FakeStripeGateway(IStripeGateway):
    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str,
        idempotency_key: str,
        metadata: dict[str, str],
    ) -> PaymentIntentResult:
        return PaymentIntentResult(
            payment_intent_id=_FAKE_PI_ID,
            client_secret=_FAKE_CLIENT_SECRET,
        )

    async def retrieve_client_secret(self, payment_intent_id: str) -> str:
        return _FAKE_CLIENT_SECRET

    def construct_webhook_event(
        self, payload: bytes, signature_header: str | None
    ) -> dict:
        return json.loads(payload)


def _payment_succeeded_event(payment_intent_id: str, event_id: str) -> dict:
    return {
        "id": event_id,
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": payment_intent_id,
                "amount": 2500,
                "amount_received": 2500,
                "currency": "usd",
                "latest_charge": "ch_test_123",
                "payment_method": "pm_test",
                "payment_method_types": ["card"],
            }
        },
    }


async def _place_authenticated_order(client: AsyncClient) -> tuple[str, str]:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "orders-user@example.com", "password": "secret123"},
    )
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "orders-user@example.com", "password": "secret123"},
    )
    token = login_response.json()["access_token"]
    client.cookies.set("access_token", token)

    await client.post(
        "/api/v1/cart/lines",
        json={"variant_id": str(_VARIANT_ID), "quantity": 1},
    )
    session_resp = await client.post(
        "/api/v1/checkout/sessions",
        headers={"Idempotency-Key": "orders-checkout-key"},
    )
    assert session_resp.status_code == 201, session_resp.text
    session_id = session_resp.json()["id"]
    await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "orders-pi-key"},
    )

    event = _payment_succeeded_event(_FAKE_PI_ID, "evt_test_orders_success")
    webhook_resp = await client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(event),
        headers={"Stripe-Signature": "fake_sig"},
    )
    assert webhook_resp.status_code == 200

    status_resp = await client.get(f"/api/v1/checkout/sessions/{session_id}")
    order_number = status_resp.json()["order_number"]
    assert order_number is not None
    return token, order_number


@pytest.fixture
async def orders_client() -> AsyncGenerator[AsyncClient, None]:
    settings.stripe_secret_key = type(settings.stripe_secret_key)("sk_test_fake")  # type: ignore[misc]
    settings.stripe_webhook_secret = type(settings.stripe_webhook_secret)("whsec_test_fake")  # type: ignore[misc]

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    product = ProductModel(
        id=_PRODUCT_ID,
        name="Order History Product",
        slug="order-history-product",
        price_cents=2500,
        currency="USD",
        in_stock=True,
    )
    variant = ProductVariantModel(
        id=_VARIANT_ID,
        product_id=_PRODUCT_ID,
        sku="ORD-HIST-1",
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

    async with session_factory() as session:
        session.add(product)
        session.add(variant)
        session.add(inventory)
        await session.commit()

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_stripe_gateway] = lambda: FakeStripeGateway()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_list_orders_requires_auth(orders_client: AsyncClient) -> None:
    response = await orders_client.get("/api/v1/orders")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_orders_returns_customer_orders(orders_client: AsyncClient) -> None:
    token, order_number = await _place_authenticated_order(orders_client)

    response = await orders_client.get(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["order_number"] == order_number
    assert data["items"][0]["status"] == "confirmed"
    assert data["items"][0]["total_cents"] == 2500


@pytest.mark.asyncio
async def test_get_order_detail(orders_client: AsyncClient) -> None:
    token, order_number = await _place_authenticated_order(orders_client)

    response = await orders_client.get(
        f"/api/v1/orders/{order_number}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["order_number"] == order_number
    assert data["total_cents"] == 2500
    assert len(data["lines"]) == 1
    assert data["lines"][0]["quantity"] == 1
    assert data["lines"][0]["product_snapshot"]["product_name"] == "Order History Product"


@pytest.mark.asyncio
async def test_get_order_detail_not_found_for_other_user(orders_client: AsyncClient) -> None:
    token, order_number = await _place_authenticated_order(orders_client)

    await orders_client.post(
        "/api/v1/auth/register",
        json={"email": "other-user@example.com", "password": "secret123"},
    )
    other_login = await orders_client.post(
        "/api/v1/auth/login",
        json={"email": "other-user@example.com", "password": "secret123"},
    )
    other_token = other_login.json()["access_token"]

    response = await orders_client.get(
        f"/api/v1/orders/{order_number}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_orders_empty_for_new_user(orders_client: AsyncClient) -> None:
    await orders_client.post(
        "/api/v1/auth/register",
        json={"email": "empty-orders@example.com", "password": "secret123"},
    )
    login_response = await orders_client.post(
        "/api/v1/auth/login",
        json={"email": "empty-orders@example.com", "password": "secret123"},
    )
    token = login_response.json()["access_token"]

    response = await orders_client.get(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []
