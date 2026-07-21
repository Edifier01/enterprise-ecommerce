"""Admin orders API tests."""

import json
import uuid
from collections.abc import AsyncGenerator

from tests.auth_helpers import mark_user_email_verified
from tests.auth_payloads import retail_register_payload
from tests.checkout_helpers import RETAIL_SHIPPING_JSON

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db_session
from app.features.admin.infrastructure.persistence.models import AdminUserModel
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.checkout.domain.entities import PaymentIntentResult
from app.features.checkout.domain.ports import IStripeGateway
from app.features.checkout.presentation.dependencies import get_stripe_gateway
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_ADMIN_EMAIL = "admin@example.com"
_ADMIN_PASSWORD = "adminsecret1"
_VIEWER_EMAIL = "viewer@example.com"
_PRODUCT_ID = uuid.uuid4()
_VARIANT_ID = uuid.uuid4()
_FAKE_PI_ID = "pi_test_admin_orders"
_FAKE_CLIENT_SECRET = "pi_test_admin_orders_secret"


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


async def _admin_token(client: AsyncClient, email: str, password: str) -> str:
    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


_admin_orders_session_factory: async_sessionmaker | None = None


async def _place_order(client: AsyncClient) -> str:
    assert _admin_orders_session_factory is not None
    await client.post(
        "/api/v1/auth/register",
        json=retail_register_payload("admin-orders-user@example.com"),
    )
    await mark_user_email_verified(
        _admin_orders_session_factory,
        "admin-orders-user@example.com",
    )
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin-orders-user@example.com", "password": "secret123"},
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
        headers={"Idempotency-Key": "admin-orders-checkout-key"},
    )
    assert session_resp.status_code == 201, session_resp.text
    session_id = session_resp.json()["id"]
    await client.post(
        f"/api/v1/checkout/sessions/{session_id}/payment-intent",
        headers={"Idempotency-Key": "admin-orders-pi-key"},
    )

    event = _payment_succeeded_event(_FAKE_PI_ID, "evt_test_admin_orders_success")
    webhook_resp = await client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(event),
        headers={"Stripe-Signature": "fake_sig"},
    )
    assert webhook_resp.status_code == 200

    status_resp = await client.get(f"/api/v1/checkout/sessions/{session_id}")
    order_number = status_resp.json()["order_number"]
    assert order_number is not None
    return order_number


@pytest.fixture
async def admin_orders_client() -> AsyncGenerator[AsyncClient, None]:
    global _admin_orders_session_factory
    settings.stripe_secret_key = type(settings.stripe_secret_key)("sk_test_fake")  # type: ignore[misc]
    settings.stripe_webhook_secret = type(settings.stripe_webhook_secret)("whsec_test_fake")  # type: ignore[misc]

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    _admin_orders_session_factory = session_factory

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    hasher = BcryptPasswordHasher()

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_stripe_gateway] = lambda: FakeStripeGateway()

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
                    id=_PRODUCT_ID,
                    name="Admin Orders Product",
                    slug="admin-orders-product",
                    price_cents=2500,
                    currency="USD",
                    in_stock=True,
                    status="active",
                )
            )
            session.add(
                ProductVariantModel(
                    id=_VARIANT_ID,
                    product_id=_PRODUCT_ID,
                    sku="ADM-ORD-1",
                    name="Default",
                    attributes={},
                    price_cents=2500,
                    in_stock=True,
                    is_default=True,
                    sort_order=0,
                )
            )
            session.add(
                InventoryItemModel(
                    id=_VARIANT_ID,
                    variant_id=_VARIANT_ID,
                    quantity_on_hand=10,
                    quantity_reserved=0,
                    version=0,
                )
            )
            await session.commit()

        yield ac

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_admin_list_orders_requires_auth(admin_orders_client: AsyncClient) -> None:
    response = await admin_orders_client.get("/api/v1/admin/orders")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_list_orders(admin_orders_client: AsyncClient) -> None:
    order_number = await _place_order(admin_orders_client)
    token = await _admin_token(admin_orders_client, _ADMIN_EMAIL, _ADMIN_PASSWORD)

    response = await admin_orders_client.get(
        "/api/v1/admin/orders",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["order_number"] == order_number
    assert data["items"][0]["status"] == "confirmed"
    assert data["items"][0]["customer_email"] == "admin-orders-user@example.com"


@pytest.mark.asyncio
async def test_admin_list_orders_search_by_email(admin_orders_client: AsyncClient) -> None:
    order_number = await _place_order(admin_orders_client)
    token = await _admin_token(admin_orders_client, _ADMIN_EMAIL, _ADMIN_PASSWORD)

    response = await admin_orders_client.get(
        "/api/v1/admin/orders?q=admin-orders-user",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["order_number"] == order_number

    empty = await admin_orders_client.get(
        "/api/v1/admin/orders?q=missing-customer@example.com",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert empty.status_code == 200
    assert empty.json()["total"] == 0


@pytest.mark.asyncio
async def test_admin_get_order_detail(admin_orders_client: AsyncClient) -> None:
    order_number = await _place_order(admin_orders_client)
    token = await _admin_token(admin_orders_client, _ADMIN_EMAIL, _ADMIN_PASSWORD)

    response = await admin_orders_client.get(
        f"/api/v1/admin/orders/{order_number}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["order_number"] == order_number
    assert len(data["lines"]) == 1
    assert len(data["status_history"]) >= 1
    assert data["customer_email"] == "admin-orders-user@example.com"
    assert data["customer_name"] == "Тест Пользователь"
    assert data["customer_phone"] == "+79001234567"
    assert data["shipping_address"] == "г. Москва, ул. Тестовая, д. 1"
    assert data["shipping_cents"] == 0


@pytest.mark.asyncio
async def test_admin_ship_order(admin_orders_client: AsyncClient) -> None:
    order_number = await _place_order(admin_orders_client)
    token = await _admin_token(admin_orders_client, _ADMIN_EMAIL, _ADMIN_PASSWORD)

    response = await admin_orders_client.patch(
        f"/api/v1/admin/orders/{order_number}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "shipped"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "shipped"


@pytest.mark.asyncio
async def test_admin_cancel_order_restores_inventory(
    admin_orders_client: AsyncClient,
) -> None:
    order_number = await _place_order(admin_orders_client)
    token = await _admin_token(admin_orders_client, _ADMIN_EMAIL, _ADMIN_PASSWORD)

    response = await admin_orders_client.patch(
        f"/api/v1/admin/orders/{order_number}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "canceled", "reason": "Customer request"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "canceled"

    inventory_resp = await admin_orders_client.get(
        "/api/v1/admin/inventory",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert inventory_resp.status_code == 200
    item = next(row for row in inventory_resp.json()["items"] if row["variant_id"] == str(_VARIANT_ID))
    assert item["quantity_on_hand"] == 10


@pytest.mark.asyncio
async def test_admin_status_update_forbidden_for_viewer(
    admin_orders_client: AsyncClient,
) -> None:
    order_number = await _place_order(admin_orders_client)
    token = await _admin_token(admin_orders_client, _VIEWER_EMAIL, _ADMIN_PASSWORD)

    response = await admin_orders_client.patch(
        f"/api/v1/admin/orders/{order_number}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "shipped"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_list_orders_export_pending_filter(admin_orders_client: AsyncClient) -> None:
    order_number = await _place_order(admin_orders_client)
    token = await _admin_token(admin_orders_client, _ADMIN_EMAIL, _ADMIN_PASSWORD)

    pending = await admin_orders_client.get(
        "/api/v1/admin/orders?export_pending=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pending.status_code == 200
    data = pending.json()
    assert data["total"] == 1
    assert data["items"][0]["order_number"] == order_number
    assert data["items"][0]["moysklad_order_id"] is None

    shipped = await admin_orders_client.patch(
        f"/api/v1/admin/orders/{order_number}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "shipped"},
    )
    assert shipped.status_code == 200

    after_ship = await admin_orders_client.get(
        "/api/v1/admin/orders?export_pending=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert after_ship.status_code == 200
    assert after_ship.json()["total"] == 0


@pytest.mark.asyncio
async def test_admin_invalid_status_transition(admin_orders_client: AsyncClient) -> None:
    order_number = await _place_order(admin_orders_client)
    token = await _admin_token(admin_orders_client, _ADMIN_EMAIL, _ADMIN_PASSWORD)

    cancel_resp = await admin_orders_client.patch(
        f"/api/v1/admin/orders/{order_number}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "canceled"},
    )
    assert cancel_resp.status_code == 200

    ship_resp = await admin_orders_client.patch(
        f"/api/v1/admin/orders/{order_number}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "shipped"},
    )
    assert ship_resp.status_code == 422
