"""List all orders for admin."""

from app.features.checkout.domain.admin_ports import AdminOrderListRow, IAdminOrdersRepository
from app.features.checkout.domain.entities import OrderStatus


class ListAdminOrdersUseCase:
    def __init__(self, repository: IAdminOrdersRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        page: int,
        limit: int,
        status: OrderStatus | None,
        export_pending: bool = False,
        q: str | None = None,
    ) -> tuple[list[AdminOrderListRow], int]:
        page = max(page, 1)
        limit = min(max(limit, 1), 100)
        return await self._repository.list_orders(
            page=page,
            limit=limit,
            status=status,
            export_pending=export_pending,
            q=q,
        )
