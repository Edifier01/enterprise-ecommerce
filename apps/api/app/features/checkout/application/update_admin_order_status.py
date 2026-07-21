"""Update order status from admin (ship / cancel)."""

from app.features.checkout.domain.admin_ports import (
    ALLOWED_ORDER_STATUS_TRANSITIONS,
    AdminOrderCustomerInfo,
    AdminOrderStatusHistoryEntry,
    IAdminOrdersRepository,
    InvalidOrderStatusTransitionError,
    OrderNotFoundError,
)
from app.features.checkout.domain.entities import Order, OrderLine, OrderStatus
from app.features.inventory.application.inventory_service import InventoryService


class UpdateAdminOrderStatusUseCase:
    def __init__(
        self,
        repository: IAdminOrdersRepository,
        inventory_service: InventoryService,
    ) -> None:
        self._repository = repository
        self._inventory_service = inventory_service

    async def execute(
        self,
        *,
        order_number: str,
        new_status: OrderStatus,
        changed_by: str,
        reason: str | None,
    ) -> tuple[Order, list[OrderLine], list[AdminOrderStatusHistoryEntry], AdminOrderCustomerInfo]:
        existing = await self._repository.get_order_detail(order_number)
        if existing is None:
            raise OrderNotFoundError(order_number)

        order, lines, _, _ = existing
        allowed = ALLOWED_ORDER_STATUS_TRANSITIONS.get(order.status, frozenset())
        if new_status not in allowed:
            raise InvalidOrderStatusTransitionError(order.status, new_status)

        if new_status == OrderStatus.CANCELED:
            await self._inventory_service.restore_order_lines(
                [(line.variant_id, line.quantity) for line in lines]
            )

        return await self._repository.update_order_status(
            order_number=order_number,
            new_status=new_status,
            changed_by=changed_by,
            reason=reason,
        )
