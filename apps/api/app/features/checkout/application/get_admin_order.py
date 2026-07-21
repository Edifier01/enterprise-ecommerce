"""Get order detail for admin."""

from app.features.checkout.domain.admin_ports import (
    AdminOrderCustomerInfo,
    AdminOrderStatusHistoryEntry,
    IAdminOrdersRepository,
)
from app.features.checkout.domain.entities import Order, OrderLine


class GetAdminOrderUseCase:
    def __init__(self, repository: IAdminOrdersRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        order_number: str,
    ) -> tuple[Order, list[OrderLine], list[AdminOrderStatusHistoryEntry], AdminOrderCustomerInfo] | None:
        return await self._repository.get_order_detail(order_number)
