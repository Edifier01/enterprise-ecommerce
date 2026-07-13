"""Dashboard summary use case."""

from datetime import datetime, timezone

from app.features.admin.domain.ports import DashboardSummary, IAdminDashboardRepository


class GetDashboardSummaryUseCase:
    def __init__(
        self,
        repository: IAdminDashboardRepository,
        low_stock_threshold: int,
    ) -> None:
        self._repository = repository
        self._low_stock_threshold = low_stock_threshold

    async def execute(self) -> DashboardSummary:
        return await self._repository.get_summary(
            now=datetime.now(timezone.utc),
            low_stock_threshold=self._low_stock_threshold,
        )
