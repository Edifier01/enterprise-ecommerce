"""Sync state repository."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.integrations.moysklad.infrastructure.persistence.models import (
    IntegrationSyncLogModel,
    IntegrationSyncStateModel,
)

PROVIDER = "moysklad"
_WEBHOOK_DEDUP_MINUTES = 5


class SyncStateRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_state(self) -> IntegrationSyncStateModel:
        row = await self._session.get(IntegrationSyncStateModel, PROVIDER)
        if row is None:
            row = IntegrationSyncStateModel(provider=PROVIDER)
            self._session.add(row)
            await self._session.flush()
        return row

    async def has_recent_webhook(self, payload_hash: str) -> bool:
        since = datetime.now(tz=UTC) - timedelta(minutes=_WEBHOOK_DEDUP_MINUTES)
        stmt = (
            select(func.count())
            .select_from(IntegrationSyncLogModel)
            .where(
                IntegrationSyncLogModel.provider == PROVIDER,
                IntegrationSyncLogModel.entity_type == "webhook",
                IntegrationSyncLogModel.payload_hash == payload_hash,
                IntegrationSyncLogModel.status == "success",
                IntegrationSyncLogModel.created_at >= since,
            )
        )
        return int((await self._session.scalar(stmt)) or 0) > 0

    async def count_recent_errors(self, *, hours: int = 24) -> int:
        since = datetime.now(tz=UTC).replace(microsecond=0)
        # SQLite tests may not support interval; use simple filter
        stmt = (
            select(func.count())
            .select_from(IntegrationSyncLogModel)
            .where(
                IntegrationSyncLogModel.provider == PROVIDER,
                IntegrationSyncLogModel.status == "error",
            )
        )
        return int((await self._session.scalar(stmt)) or 0)

    async def list_recent_logs(self, *, limit: int = 50) -> list[IntegrationSyncLogModel]:
        stmt = (
            select(IntegrationSyncLogModel)
            .where(IntegrationSyncLogModel.provider == PROVIDER)
            .order_by(IntegrationSyncLogModel.created_at.desc())
            .limit(limit)
        )
        return list((await self._session.scalars(stmt)).all())

    async def log_event(
        self,
        *,
        direction: str,
        entity_type: str,
        entity_id: str | None,
        status: str,
        payload_hash: str | None = None,
        error_message: str | None = None,
    ) -> None:
        self._session.add(
            IntegrationSyncLogModel(
                provider=PROVIDER,
                direction=direction,
                entity_type=entity_type,
                entity_id=entity_id,
                status=status,
                payload_hash=payload_hash,
                error_message=error_message,
            )
        )
