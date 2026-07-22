"""Admin bulk job repository port."""

from abc import ABC, abstractmethod
from uuid import UUID

from app.features.admin.domain.bulk_job_entities import (
    AdminBulkJob,
    AdminBulkJobProgressUpdate,
    AdminBulkJobStatus,
    CreateAdminBulkJobData,
)


class IAdminBulkJobRepository(ABC):
    @abstractmethod
    async def create(self, data: CreateAdminBulkJobData) -> AdminBulkJob:
        raise NotImplementedError

    @abstractmethod
    async def get_by_id(self, job_id: UUID) -> AdminBulkJob | None:
        raise NotImplementedError

    @abstractmethod
    async def mark_running(self, job_id: UUID) -> None:
        raise NotImplementedError

    @abstractmethod
    async def update_progress(self, job_id: UUID, update: AdminBulkJobProgressUpdate) -> None:
        raise NotImplementedError

    @abstractmethod
    async def mark_completed(self, job_id: UUID, *, result_message: str | None) -> None:
        raise NotImplementedError

    @abstractmethod
    async def mark_failed(self, job_id: UUID, *, result_message: str) -> None:
        raise NotImplementedError

    @abstractmethod
    async def set_status(self, job_id: UUID, status: AdminBulkJobStatus) -> None:
        raise NotImplementedError
