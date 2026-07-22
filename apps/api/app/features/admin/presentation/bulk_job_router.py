"""Admin bulk job API routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.features.admin.application.bulk_job_scheduler import schedule_admin_bulk_job
from app.features.admin.domain.bulk_job_entities import (
    MAX_ADMIN_BULK_JOB_ITEMS,
    AdminBulkJobType,
    CreateAdminBulkJobData,
)
from app.features.admin.domain.entities import AdminUser
from app.features.admin.infrastructure.persistence.bulk_job_repository import AdminBulkJobRepository
from app.features.admin.presentation.bulk_job_schemas import (
    AdminBulkJobCreateRequest,
    AdminBulkJobErrorSchema,
    AdminBulkJobResponse,
    AdminBulkJobStatusSchema,
    AdminBulkJobTypeSchema,
)
from app.features.admin.presentation.dependencies import require_permission

router = APIRouter(prefix="/admin/jobs", tags=["admin"])


def get_admin_bulk_job_repository(
    session: AsyncSession = Depends(get_db_session),
) -> AdminBulkJobRepository:
    return AdminBulkJobRepository(session)


def _to_response(job) -> AdminBulkJobResponse:
    return AdminBulkJobResponse(
        id=job.id,
        job_type=AdminBulkJobTypeSchema(job.job_type.value),
        status=AdminBulkJobStatusSchema(job.status.value),
        total=job.total,
        processed=job.processed,
        succeeded=job.succeeded,
        failed=job.failed,
        skipped=job.skipped,
        skip_reasons=job.skip_reasons,
        errors=[AdminBulkJobErrorSchema(**entry) for entry in job.errors],
        result_message=job.result_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
    )


@router.post(
    "/bulk",
    response_model=AdminBulkJobResponse,
    status_code=202,
    operation_id="adminCreateBulkJob",
)
async def admin_create_bulk_job(
    request: AdminBulkJobCreateRequest,
    admin: AdminUser = Depends(require_permission("catalog:write")),
    repo: AdminBulkJobRepository = Depends(get_admin_bulk_job_repository),
    session: AsyncSession = Depends(get_db_session),
) -> AdminBulkJobResponse:
    if len(request.product_ids) > MAX_ADMIN_BULK_JOB_ITEMS:
        raise HTTPException(
            status_code=422,
            detail=f"Maximum {MAX_ADMIN_BULK_JOB_ITEMS} products per bulk job.",
        )

    if request.job_type is AdminBulkJobTypeSchema.assign_category:
        if request.category_id is None:
            raise HTTPException(status_code=422, detail="category_id is required")
        payload = {"category_id": str(request.category_id)}
        job_type = AdminBulkJobType.ASSIGN_CATEGORY
    elif request.job_type is AdminBulkJobTypeSchema.publish_products:
        payload = {}
        job_type = AdminBulkJobType.PUBLISH_PRODUCTS
    else:
        raise HTTPException(status_code=422, detail="Unsupported job type")

    job = await repo.create(
        CreateAdminBulkJobData(
            job_type=job_type,
            created_by=admin.id,
            payload=payload,
            product_ids=request.product_ids,
        )
    )
    await session.commit()
    schedule_admin_bulk_job(job.id)
    return _to_response(job)


@router.get(
    "/bulk/{job_id}",
    response_model=AdminBulkJobResponse,
    operation_id="adminGetBulkJob",
)
async def admin_get_bulk_job(
    job_id: UUID,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    repo: AdminBulkJobRepository = Depends(get_admin_bulk_job_repository),
) -> AdminBulkJobResponse:
    job = await repo.get_by_id(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Bulk job not found")
    return _to_response(job)
