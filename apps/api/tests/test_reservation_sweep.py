"""Inventory reservation TTL sweep tests."""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.inventory.application.inventory_service import InventoryService
from app.features.inventory.application.sweep_expired_reservations import (
    sweep_expired_reservations,
)
from app.features.inventory.infrastructure.background.reservation_sweep_scheduler import (
    start_reservation_sweep,
)
from app.features.inventory.infrastructure.persistence.models import (
    InventoryItemModel,
    InventoryReservationModel,
)
from app.features.inventory.infrastructure.persistence.repository import InventoryRepository

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

_PRODUCT_ID = uuid.uuid4()
_VARIANT_ID = uuid.uuid4()
_CHECKOUT_SESSION_ID = uuid.uuid4()


@pytest.fixture
async def inventory_session_factory() -> AsyncGenerator[async_sessionmaker, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    product = ProductModel(
        id=_PRODUCT_ID,
        name="Sweep Test Product",
        slug="sweep-test-product",
        price_cents=1000,
        currency="USD",
        in_stock=True,
    )
    variant = ProductVariantModel(
        id=_VARIANT_ID,
        product_id=_PRODUCT_ID,
        sku="SWEEP-SKU-1",
        name="Default",
        attributes={},
        price_cents=1000,
        in_stock=True,
        is_default=True,
        sort_order=0,
    )
    inventory = InventoryItemModel(
        id=uuid.uuid4(),
        variant_id=_VARIANT_ID,
        quantity_on_hand=10,
        quantity_reserved=2,
        version=0,
    )
    expired_reservation = InventoryReservationModel(
        variant_id=_VARIANT_ID,
        quantity=2,
        reference_type="checkout_session",
        reference_id=_CHECKOUT_SESSION_ID,
        status="active",
        expires_at=datetime.now(UTC) - timedelta(minutes=1),
    )

    async with session_factory() as session:
        session.add(product)
        session.add(variant)
        session.add(inventory)
        session.add(expired_reservation)
        await session.commit()

    yield session_factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_expire_active_reservations_releases_stock(
    inventory_session_factory: async_sessionmaker,
) -> None:
    async with inventory_session_factory() as session:
        service = InventoryService(InventoryRepository(session))
        expired_count = await service.expire_active_reservations()
        await session.commit()

        assert expired_count == 1

        inventory = (
            await session.execute(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == _VARIANT_ID)
            )
        ).scalar_one()
        assert inventory.quantity_reserved == 0
        assert inventory.quantity_on_hand == 10

        reservations = (
            await session.execute(select(InventoryReservationModel))
        ).scalars().all()
        assert len(reservations) == 1
        assert reservations[0].status == "expired"


@pytest.mark.asyncio
async def test_sweep_expired_reservations_via_session_factory(
    inventory_session_factory: async_sessionmaker,
) -> None:
    expired_count = await sweep_expired_reservations(inventory_session_factory)
    assert expired_count == 1

    async with inventory_session_factory() as session:
        inventory = (
            await session.execute(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == _VARIANT_ID)
            )
        ).scalar_one()
        assert inventory.quantity_reserved == 0


@pytest.mark.asyncio
async def test_sweep_returns_zero_when_nothing_expired(
    inventory_session_factory: async_sessionmaker,
) -> None:
    async with inventory_session_factory() as session:
        reservation = (
            await session.execute(select(InventoryReservationModel))
        ).scalar_one()
        reservation.expires_at = datetime.now(UTC) + timedelta(minutes=10)
        await session.commit()

    expired_count = await sweep_expired_reservations(inventory_session_factory)
    assert expired_count == 0


def test_scheduler_disabled_when_config_off(monkeypatch: pytest.MonkeyPatch) -> None:
    import asyncio

    from app.core import config as config_module

    monkeypatch.setattr(config_module.settings, "inventory_reservation_sweep_enabled", False)
    stop_event = asyncio.Event()
    task = start_reservation_sweep(stop_event)
    assert task is None
