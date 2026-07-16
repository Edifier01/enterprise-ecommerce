"""Product recommendation (popular sort) API tests."""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.checkout.infrastructure.persistence.models import (
    CartModel,
    CheckoutSessionModel,
    OrderLineModel,
    OrderModel,
    PaymentRecordModel,
)
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

_PRODUCT_A_ID = uuid.uuid4()
_PRODUCT_B_ID = uuid.uuid4()
_VARIANT_A_ID = uuid.uuid4()
_VARIANT_B_ID = uuid.uuid4()


def _product_snapshot(slug: str, name: str) -> dict:
    return {"slug": slug, "name": name, "currency": "RUB"}


async def _seed_popular_catalog(session: AsyncSession) -> None:
    session.add_all(
        [
            ProductModel(
                id=_PRODUCT_A_ID,
                name="Popular Product A",
                slug="popular-product-a",
                price_cents=1000,
                currency="RUB",
                in_stock=True,
                status="active",
            ),
            ProductModel(
                id=_PRODUCT_B_ID,
                name="Popular Product B",
                slug="popular-product-b",
                price_cents=2000,
                currency="RUB",
                in_stock=True,
                status="active",
            ),
        ]
    )
    session.add_all(
        [
            ProductVariantModel(
                id=_VARIANT_A_ID,
                product_id=_PRODUCT_A_ID,
                sku="POP-A",
                name="Default",
                price_cents=1000,
                in_stock=True,
                is_default=True,
                sort_order=0,
                attributes={},
            ),
            ProductVariantModel(
                id=_VARIANT_B_ID,
                product_id=_PRODUCT_B_ID,
                sku="POP-B",
                name="Default",
                price_cents=2000,
                in_stock=True,
                is_default=True,
                sort_order=0,
                attributes={},
            ),
        ]
    )


async def _insert_order(
    session: AsyncSession,
    *,
    variant_id: uuid.UUID,
    quantity: int,
    order_number: str,
) -> None:
    cart_id = uuid.uuid4()
    checkout_session_id = uuid.uuid4()
    payment_record_id = uuid.uuid4()
    order_id = uuid.uuid4()

    session.add(
        CartModel(
            id=cart_id,
            session_token=f"tok-{order_number}",
            status="converted",
        )
    )
    session.add(
        CheckoutSessionModel(
            id=checkout_session_id,
            cart_id=cart_id,
            status="completed",
            currency="RUB",
            subtotal_cents=1000 * quantity,
            total_cents=1000 * quantity,
        )
    )
    session.add(
        PaymentRecordModel(
            id=payment_record_id,
            checkout_session_id=checkout_session_id,
            stripe_payment_intent_id=f"pi_{order_number}",
            amount_cents=1000 * quantity,
            currency="RUB",
            status="succeeded",
            idempotency_key=f"idem-{order_number}",
        )
    )
    session.add(
        OrderModel(
            id=order_id,
            order_number=order_number,
            checkout_session_id=checkout_session_id,
            status="confirmed",
            currency="RUB",
            subtotal_cents=1000 * quantity,
            total_cents=1000 * quantity,
            payment_record_id=payment_record_id,
            created_at=datetime.now(UTC),
        )
    )
    session.add(
        OrderLineModel(
            id=uuid.uuid4(),
            order_id=order_id,
            variant_id=variant_id,
            quantity=quantity,
            unit_price_cents=1000,
            line_total_cents=1000 * quantity,
            product_snapshot=_product_snapshot("x", "x"),
        )
    )


@pytest.fixture
async def recommendations_client() -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with session_factory() as session:
            await _seed_popular_catalog(session)
            await _insert_order(
                session,
                variant_id=_VARIANT_A_ID,
                quantity=5,
                order_number="ORD-POP-A",
            )
            await _insert_order(
                session,
                variant_id=_VARIANT_B_ID,
                quantity=1,
                order_number="ORD-POP-B",
            )
            await session.commit()
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
async def recommendations_cold_start_client() -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with session_factory() as session:
            await _seed_popular_catalog(session)
            await session.commit()
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_popular_sort_ranks_by_sales(recommendations_client: AsyncClient) -> None:
    response = await recommendations_client.get(
        "/api/v1/products",
        params={"sort": "popular", "in_stock": True, "limit": 10},
    )
    assert response.status_code == 200
    slugs = [item["slug"] for item in response.json()["items"]]
    assert slugs[0] == "popular-product-a"
    assert "popular-product-b" in slugs


@pytest.mark.asyncio
async def test_popular_sort_cold_start_falls_back_to_newest(
    recommendations_cold_start_client: AsyncClient,
) -> None:
    response = await recommendations_cold_start_client.get(
        "/api/v1/products",
        params={"sort": "popular", "in_stock": True, "limit": 10},
    )
    assert response.status_code == 200
    assert len(response.json()["items"]) == 2
