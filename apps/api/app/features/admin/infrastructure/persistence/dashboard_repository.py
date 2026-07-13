"""Read-only dashboard queries for admin reporting."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.admin.domain.ports import DashboardSummary, IAdminDashboardRepository
from app.features.checkout.infrastructure.persistence.models import OrderModel
from app.features.inventory.infrastructure.persistence.models import InventoryItemModel

_REVENUE_EXCLUDED_STATUSES = frozenset({"cancelled", "refunded"})


class AdminDashboardRepository(IAdminDashboardRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_summary(
        self,
        *,
        now: datetime,
        low_stock_threshold: int,
    ) -> DashboardSummary:
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = start_of_day - timedelta(days=7)

        orders_today = int(
            (
                await self._session.scalar(
                    select(func.count())
                    .select_from(OrderModel)
                    .where(OrderModel.created_at >= start_of_day)
                )
            )
            or 0
        )

        orders_last_7_days = int(
            (
                await self._session.scalar(
                    select(func.count())
                    .select_from(OrderModel)
                    .where(OrderModel.created_at >= start_of_week)
                )
            )
            or 0
        )

        revenue_last_7_days_cents = int(
            (
                await self._session.scalar(
                    select(func.coalesce(func.sum(OrderModel.total_cents), 0))
                    .select_from(OrderModel)
                    .where(OrderModel.created_at >= start_of_week)
                    .where(OrderModel.status.notin_(_REVENUE_EXCLUDED_STATUSES))
                )
            )
            or 0
        )

        available_expr = InventoryItemModel.quantity_on_hand - InventoryItemModel.quantity_reserved
        low_stock_count = int(
            (
                await self._session.scalar(
                    select(func.count())
                    .select_from(InventoryItemModel)
                    .where(available_expr <= low_stock_threshold)
                )
            )
            or 0
        )

        status_rows = await self._session.execute(
            select(OrderModel.status, func.count())
            .group_by(OrderModel.status)
        )
        orders_by_status = {status: int(count) for status, count in status_rows.all()}

        return DashboardSummary(
            orders_today=orders_today,
            orders_last_7_days=orders_last_7_days,
            revenue_last_7_days_cents=revenue_last_7_days_cents,
            low_stock_count=low_stock_count,
            orders_by_status=orders_by_status,
        )
