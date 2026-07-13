"""Admin dashboard routes."""

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.features.admin.application.get_dashboard_summary import GetDashboardSummaryUseCase
from app.features.admin.domain.entities import AdminUser
from app.features.admin.domain.ports import IAdminDashboardRepository
from app.features.admin.presentation.dependencies import (
    get_admin_dashboard_repository,
    require_permission,
)
from app.features.admin.presentation.schemas import DashboardSummaryResponse

router = APIRouter(prefix="/admin/dashboard", tags=["admin"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    operation_id="getAdminDashboardSummary",
)
async def dashboard_summary(
    _admin: AdminUser = Depends(require_permission("admin:read")),
    repo: IAdminDashboardRepository = Depends(get_admin_dashboard_repository),
) -> DashboardSummaryResponse:
    use_case = GetDashboardSummaryUseCase(
        repo,
        low_stock_threshold=settings.admin_low_stock_threshold,
    )
    summary = await use_case.execute()
    return DashboardSummaryResponse(
        orders_today=summary.orders_today,
        orders_last_7_days=summary.orders_last_7_days,
        revenue_last_7_days_cents=summary.revenue_last_7_days_cents,
        low_stock_count=summary.low_stock_count,
        orders_by_status=summary.orders_by_status,
    )
