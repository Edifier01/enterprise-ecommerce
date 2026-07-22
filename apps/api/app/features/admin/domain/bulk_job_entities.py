"""Admin bulk job domain types."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from uuid import UUID

MAX_ADMIN_BULK_JOB_ITEMS = 200
MAX_ADMIN_BULK_JOB_ERRORS = 50


class AdminBulkJobType(StrEnum):
    ASSIGN_CATEGORY = "assign_category"
    PUBLISH_PRODUCTS = "publish_products"


class AdminBulkJobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass(frozen=True, slots=True)
class AdminBulkJob:
    id: UUID
    job_type: AdminBulkJobType
    status: AdminBulkJobStatus
    created_by: UUID | None
    payload: dict
    total: int
    processed: int
    succeeded: int
    failed: int
    skipped: int
    skip_reasons: dict[str, int]
    errors: list[dict[str, str]]
    result_message: str | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


@dataclass(frozen=True, slots=True)
class CreateAdminBulkJobData:
    job_type: AdminBulkJobType
    created_by: UUID | None
    payload: dict
    product_ids: list[UUID]


@dataclass(slots=True)
class AdminBulkJobProgressUpdate:
    processed: int
    succeeded: int
    failed: int
    skipped: int
    skip_reasons: dict[str, int] = field(default_factory=dict)
    errors: list[dict[str, str]] = field(default_factory=list)
    result_message: str | None = None
