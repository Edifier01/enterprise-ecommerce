"""Admin bulk job persistence."""

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.admin.domain.bulk_job_entities import (
    AdminBulkJob,
    AdminBulkJobProgressUpdate,
    AdminBulkJobStatus,
    AdminBulkJobType,
    CreateAdminBulkJobData,
)
from app.features.admin.domain.bulk_job_ports import IAdminBulkJobRepository
from app.features.admin.infrastructure.persistence.bulk_job_models import AdminBulkJobModel


def _to_entity(row: AdminBulkJobModel) -> AdminBulkJob:
    return AdminBulkJob(
        id=row.id,
        job_type=AdminBulkJobType(row.job_type),
        status=AdminBulkJobStatus(row.status),
        created_by=row.created_by,
        payload=dict(row.payload or {}),
        total=row.total,
        processed=row.processed,
        succeeded=row.succeeded,
        failed=row.failed,
        skipped=row.skipped,
        skip_reasons=dict(row.skip_reasons or {}),
        errors=list(row.errors or []),
        result_message=row.result_message,
        created_at=row.created_at,
        updated_at=row.updated_at,
        started_at=row.started_at,
        finished_at=row.finished_at,
    )


class AdminBulkJobRepository(IAdminBulkJobRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, data: CreateAdminBulkJobData) -> AdminBulkJob:
        row = AdminBulkJobModel(
            id=uuid.uuid4(),
            job_type=data.job_type.value,
            status=AdminBulkJobStatus.PENDING.value,
            created_by=data.created_by,
            payload={
                **data.payload,
                "product_ids": [str(product_id) for product_id in data.product_ids],
            },
            total=len(data.product_ids),
        )
        self._session.add(row)
        await self._session.flush()
        return _to_entity(row)

    async def get_by_id(self, job_id: uuid.UUID) -> AdminBulkJob | None:
        row = await self._session.get(AdminBulkJobModel, job_id)
        return _to_entity(row) if row else None

    async def mark_running(self, job_id: uuid.UUID) -> None:
        row = await self._session.get(AdminBulkJobModel, job_id)
        if row is None:
            return
        row.status = AdminBulkJobStatus.RUNNING.value
        row.started_at = datetime.now(UTC)
        await self._session.flush()

    async def update_progress(self, job_id: uuid.UUID, update: AdminBulkJobProgressUpdate) -> None:
        row = await self._session.get(AdminBulkJobModel, job_id)
        if row is None:
            return
        row.processed = update.processed
        row.succeeded = update.succeeded
        row.failed = update.failed
        row.skipped = update.skipped
        row.skip_reasons = dict(update.skip_reasons)
        row.errors = list(update.errors)
        if update.result_message is not None:
            row.result_message = update.result_message
        await self._session.flush()

    async def mark_completed(self, job_id: uuid.UUID, *, result_message: str | None) -> None:
        row = await self._session.get(AdminBulkJobModel, job_id)
        if row is None:
            return
        row.status = AdminBulkJobStatus.COMPLETED.value
        row.result_message = result_message
        row.finished_at = datetime.now(UTC)
        await self._session.flush()

    async def mark_failed(self, job_id: uuid.UUID, *, result_message: str) -> None:
        row = await self._session.get(AdminBulkJobModel, job_id)
        if row is None:
            return
        row.status = AdminBulkJobStatus.FAILED.value
        row.result_message = result_message
        row.finished_at = datetime.now(UTC)
        await self._session.flush()

    async def set_status(self, job_id: uuid.UUID, status: AdminBulkJobStatus) -> None:
        row = await self._session.get(AdminBulkJobModel, job_id)
        if row is None:
            return
        row.status = status.value
        await self._session.flush()
