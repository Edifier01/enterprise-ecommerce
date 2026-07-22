"""Admin bulk job API schemas."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminBulkJobTypeSchema(StrEnum):
    assign_category = "assign_category"
    publish_products = "publish_products"


class AdminBulkJobStatusSchema(StrEnum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class AdminBulkJobErrorSchema(BaseModel):
    product_id: str
    message: str


class AdminBulkJobCreateRequest(BaseModel):
    job_type: AdminBulkJobTypeSchema
    product_ids: list[UUID] = Field(min_length=1)
    category_id: UUID | None = None


class AdminBulkJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_type: AdminBulkJobTypeSchema
    status: AdminBulkJobStatusSchema
    total: int
    processed: int
    succeeded: int
    failed: int
    skipped: int
    skip_reasons: dict[str, int]
    errors: list[AdminBulkJobErrorSchema]
    result_message: str | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
