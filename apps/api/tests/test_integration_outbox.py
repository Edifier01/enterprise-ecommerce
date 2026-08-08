"""Tests for ADR-016 MoySklad export outbox."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.features.integrations.moysklad.infrastructure.persistence.outbox_repository import (
    IntegrationOutboxRepository,
    MOYSKLAD_ORDER_EXPORT_EVENT,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def outbox_session_factory():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield session_factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_enqueue_moysklad_order_export_is_idempotent(
    outbox_session_factory: async_sessionmaker,
) -> None:
    order_id = uuid.uuid4()
    async with outbox_session_factory() as session:
        repo = IntegrationOutboxRepository(session)
        await repo.enqueue_moysklad_order_export(order_id)
        await repo.enqueue_moysklad_order_export(order_id)
        await session.commit()

    async with outbox_session_factory() as session:
        from sqlalchemy import func, select

        from app.features.integrations.moysklad.infrastructure.persistence.models import (
            IntegrationOutboxModel,
        )

        count = await session.scalar(
            select(func.count())
            .select_from(IntegrationOutboxModel)
            .where(
                IntegrationOutboxModel.event_type == MOYSKLAD_ORDER_EXPORT_EVENT,
                IntegrationOutboxModel.aggregate_id == order_id,
            )
        )
        assert count == 1
