"""Transactional outbox for MoySklad order export (ADR-016)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.integrations.moysklad.infrastructure.persistence.models import (
    IntegrationOutboxModel,
)

MOYSKLAD_ORDER_EXPORT_EVENT = "moysklad.order_export"


class IntegrationOutboxRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def enqueue_moysklad_order_export(self, order_id: uuid.UUID) -> None:
        existing = await self._session.scalar(
            select(IntegrationOutboxModel.id).where(
                IntegrationOutboxModel.event_type == MOYSKLAD_ORDER_EXPORT_EVENT,
                IntegrationOutboxModel.aggregate_id == order_id,
            )
        )
        if existing is not None:
            return
        self._session.add(
            IntegrationOutboxModel(
                event_type=MOYSKLAD_ORDER_EXPORT_EVENT,
                aggregate_id=order_id,
                status="pending",
                attempts=0,
            )
        )
        await self._session.flush()

    async def list_pending_moysklad_exports(self, *, limit: int = 20) -> list[uuid.UUID]:
        stmt = (
            select(IntegrationOutboxModel.aggregate_id)
            .where(
                IntegrationOutboxModel.event_type == MOYSKLAD_ORDER_EXPORT_EVENT,
                IntegrationOutboxModel.status == "pending",
            )
            .order_by(IntegrationOutboxModel.created_at.asc())
            .limit(limit)
        )
        return list((await self._session.scalars(stmt)).all())

    async def mark_completed(self, order_id: uuid.UUID) -> None:
        await self._session.execute(
            update(IntegrationOutboxModel)
            .where(
                IntegrationOutboxModel.event_type == MOYSKLAD_ORDER_EXPORT_EVENT,
                IntegrationOutboxModel.aggregate_id == order_id,
            )
            .values(status="completed", processed_at=datetime.now(UTC), last_error=None)
        )

    async def record_failure(self, order_id: uuid.UUID, error: str) -> None:
        row = await self._session.scalar(
            select(IntegrationOutboxModel).where(
                IntegrationOutboxModel.event_type == MOYSKLAD_ORDER_EXPORT_EVENT,
                IntegrationOutboxModel.aggregate_id == order_id,
            )
        )
        if row is None:
            return
        row.attempts += 1
        row.last_error = error[:2000]
        await self._session.flush()
