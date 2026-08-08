"""ADR-015 ERP stock reconciliation tests."""

import uuid
from datetime import timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.features.catalog.infrastructure.inventory_ports_adapter import (
    StorefrontAvailabilityAdapter,
    VariantSourceAdapter,
)
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.integrations.moysklad.infrastructure.persistence.catalog_sync_repository import (
    CatalogSyncRepository,
)
from app.features.inventory.application.inventory_service import InventoryService
from app.features.inventory.domain.entities import InventoryReservationRequestLine
from app.features.inventory.domain.errors import InventoryItemMissingError
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel
from app.features.inventory.infrastructure.persistence.repository import InventoryRepository

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


def _build_service(session: AsyncSession) -> InventoryService:
    return InventoryService(
        InventoryRepository(session),
        reservation_ttl=timedelta(minutes=15),
        variant_source=VariantSourceAdapter(session),
        storefront_availability=StorefrontAvailabilityAdapter(session),
    )


async def _seed_variant(
    session: AsyncSession,
    *,
    sync_source: str = "moysklad",
    on_hand: int = 5,
    reserved: int = 0,
    awaiting: int = 0,
) -> tuple[uuid.UUID, ProductVariantModel]:
    product_id = uuid.uuid4()
    variant_id = uuid.uuid4()
    session.add(
        ProductModel(
            id=product_id,
            name="ERP Stock Test",
            slug=f"erp-stock-{variant_id.hex[:8]}",
            price_cents=1000,
            currency="RUB",
            in_stock=True,
            status="active",
            sync_source=sync_source,
        )
    )
    variant = ProductVariantModel(
        id=variant_id,
        product_id=product_id,
        sku=f"SKU-{variant_id.hex[:8]}",
        name="Default",
        price_cents=1000,
        in_stock=True,
        is_default=True,
        sort_order=0,
        moysklad_variant_id="ms-var-test",
    )
    session.add(variant)
    session.add(
        InventoryItemModel(
            id=uuid.uuid4(),
            variant_id=variant_id,
            quantity_on_hand=on_hand,
            quantity_reserved=reserved,
            quantity_awaiting_fulfillment=awaiting,
            version=0,
        )
    )
    await session.commit()
    return variant_id, variant


@pytest.mark.asyncio
async def test_erp_commit_then_apply_stock_no_oversell() -> None:
    """t0–t4 timeline: paid ERP sale stays unsellable after MS sync."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            variant_id, variant = await _seed_variant(session, on_hand=5)
            service = _build_service(session)
            checkout_id = uuid.uuid4()

            await service.reserve_reference(
                reference_type=InventoryService.CHECKOUT_REFERENCE_TYPE,
                reference_id=checkout_id,
                lines=[InventoryReservationRequestLine(variant_id=variant_id, quantity=5)],
            )
            await service.deduct_reference(
                InventoryService.CHECKOUT_REFERENCE_TYPE,
                checkout_id,
            )
            await session.commit()

            item = await session.scalar(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == variant_id)
            )
            assert item is not None
            assert item.quantity_on_hand == 5
            assert item.quantity_reserved == 0
            assert item.quantity_awaiting_fulfillment == 5
            assert item.quantity_on_hand - item.quantity_reserved - item.quantity_awaiting_fulfillment == 0

            repo = CatalogSyncRepository(session)
            await repo.apply_stock(variant, 5)
            await session.commit()

            item = await session.scalar(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == variant_id)
            )
            assert item is not None
            assert item.quantity_on_hand == 5
            assert item.quantity_awaiting_fulfillment == 5
            available = item.quantity_on_hand - item.quantity_reserved - item.quantity_awaiting_fulfillment
            assert available == 0
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_apply_stock_restock_raises_available() -> None:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            variant_id, variant = await _seed_variant(session, on_hand=5, awaiting=0)
            repo = CatalogSyncRepository(session)
            await repo.apply_stock(variant, 10)
            await session.commit()

            item = await session.scalar(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == variant_id)
            )
            assert item is not None
            available = item.quantity_on_hand - item.quantity_reserved - item.quantity_awaiting_fulfillment
            assert available == 10
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_manual_commit_deducts_on_hand() -> None:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            variant_id, _variant = await _seed_variant(session, sync_source="manual", on_hand=10)
            service = _build_service(session)
            checkout_id = uuid.uuid4()

            await service.reserve_reference(
                reference_type=InventoryService.CHECKOUT_REFERENCE_TYPE,
                reference_id=checkout_id,
                lines=[InventoryReservationRequestLine(variant_id=variant_id, quantity=2)],
            )
            await service.deduct_reference(
                InventoryService.CHECKOUT_REFERENCE_TYPE,
                checkout_id,
            )
            await session.commit()

            item = await session.scalar(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == variant_id)
            )
            assert item is not None
            assert item.quantity_on_hand == 8
            assert item.quantity_awaiting_fulfillment == 0
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_cancel_erp_settles_awaiting_not_on_hand() -> None:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            variant_id, _variant = await _seed_variant(
                session, on_hand=5, reserved=0, awaiting=3
            )
            service = _build_service(session)
            await service.restore_order_lines([(variant_id, 3)])
            await session.commit()

            item = await session.scalar(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == variant_id)
            )
            assert item is not None
            assert item.quantity_on_hand == 5
            assert item.quantity_awaiting_fulfillment == 0
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_commit_raises_when_inventory_row_missing() -> None:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            missing_variant_id = uuid.uuid4()
            repo = InventoryRepository(session)
            with pytest.raises(InventoryItemMissingError):
                await repo.commit_reserved(missing_variant_id, 1, erp_managed=True)
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_apply_stock_drop_settles_awaiting() -> None:
    """MS physical stock drop releases matching awaiting (ADR-015 MVP signal)."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            variant_id, variant = await _seed_variant(
                session, on_hand=5, reserved=0, awaiting=5
            )
            repo = CatalogSyncRepository(session)
            await repo.apply_stock(variant, 0)
            await session.commit()

            item = await session.scalar(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == variant_id)
            )
            assert item is not None
            assert item.quantity_on_hand == 0
            assert item.quantity_awaiting_fulfillment == 0
            assert (
                item.quantity_on_hand
                - item.quantity_reserved
                - item.quantity_awaiting_fulfillment
                == 0
            )
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_convergence_sweep_includes_locally_shipped_exports() -> None:
    """ADR-015 §5b: expected awaiting sums CONFIRMED + local SHIPPED unfulfilled exports."""
    from sqlalchemy import text

    from app.features.checkout.infrastructure.persistence.models import OrderLineModel, OrderModel
    from app.features.integrations.moysklad.application.reconcile_stock import (
        ReconcileErpStockUseCase,
    )
    from app.features.integrations.moysklad.domain.ports import IMoySkladClient

    class _FakeClient(IMoySkladClient):
        async def list_products(self, *, offset: int = 0, limit: int = 100):
            return [], 0

        async def list_variants(self, *, offset: int = 0, limit: int = 100):
            return [], 0

        async def list_stock_by_store(self, *, offset: int = 0, limit: int = 1000):
            return {}, 0, 0

        async def get_product(self, product_id: str):
            return None

        async def get_variant(self, variant_id: str):
            return None

        async def list_variants_for_product(self, product_id: str):
            return []

        async def get_customer_order(self, order_id: str):
            return {"deleted": False, "state_name": None}

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            await session.execute(text("PRAGMA foreign_keys=OFF"))
            variant_id, _variant = await _seed_variant(
                session, on_hand=20, reserved=0, awaiting=2
            )

            confirmed_id = uuid.uuid4()
            shipped_id = uuid.uuid4()
            session.add_all(
                [
                    OrderModel(
                        id=confirmed_id,
                        order_number="ERP-CONF-1",
                        checkout_session_id=uuid.uuid4(),
                        status="confirmed",
                        currency="RUB",
                        subtotal_cents=1000,
                        total_cents=1000,
                        payment_record_id=uuid.uuid4(),
                        moysklad_order_id="ms-order-conf",
                        erp_fulfilled_at=None,
                    ),
                    OrderModel(
                        id=shipped_id,
                        order_number="ERP-SHIP-1",
                        checkout_session_id=uuid.uuid4(),
                        status="shipped",
                        currency="RUB",
                        subtotal_cents=1500,
                        total_cents=1500,
                        payment_record_id=uuid.uuid4(),
                        moysklad_order_id="ms-order-ship",
                        erp_fulfilled_at=None,
                    ),
                    OrderLineModel(
                        id=uuid.uuid4(),
                        order_id=confirmed_id,
                        variant_id=variant_id,
                        quantity=2,
                        unit_price_cents=500,
                        line_total_cents=1000,
                        product_snapshot={"name": "x"},
                    ),
                    OrderLineModel(
                        id=uuid.uuid4(),
                        order_id=shipped_id,
                        variant_id=variant_id,
                        quantity=3,
                        unit_price_cents=500,
                        line_total_cents=1500,
                        product_snapshot={"name": "x"},
                    ),
                ]
            )
            await session.commit()

            use_case = ReconcileErpStockUseCase(
                session, _FakeClient(), _build_service(session)
            )
            result = await use_case.execute(limit=10)
            await session.commit()

            item = await session.scalar(
                select(InventoryItemModel).where(InventoryItemModel.variant_id == variant_id)
            )
            assert item is not None
            assert item.quantity_awaiting_fulfillment == 5  # 2 confirmed + 3 shipped
            assert result.variants_swept == 1
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_available_quantity_includes_awaiting() -> None:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            variant_id, _variant = await _seed_variant(
                session, on_hand=10, reserved=2, awaiting=3
            )
            repo = InventoryRepository(session)
            available = await repo.get_available_quantity(variant_id)
            assert available == 5
    finally:
        await engine.dispose()
