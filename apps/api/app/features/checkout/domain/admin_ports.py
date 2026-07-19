"""Admin orders repository port."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.features.checkout.domain.entities import Order, OrderLine, OrderStatus


class OrderNotFoundError(Exception):
    """Raised when the order does not exist."""


class InvalidOrderStatusTransitionError(Exception):
    """Raised when the requested status transition is not allowed."""

    def __init__(self, from_status: OrderStatus, to_status: OrderStatus) -> None:
        self.from_status = from_status
        self.to_status = to_status
        super().__init__(f"Cannot transition order from {from_status.value} to {to_status.value}")


ALLOWED_ORDER_STATUS_TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.CONFIRMED: frozenset({OrderStatus.SHIPPED, OrderStatus.CANCELED}),
    OrderStatus.SHIPPED: frozenset({OrderStatus.CANCELED}),
    OrderStatus.CANCELED: frozenset(),
}


@dataclass(frozen=True, slots=True)
class AdminOrderListRow:
    id: UUID
    order_number: str
    status: OrderStatus
    currency: str
    total_cents: int
    customer_email: str | None
    moysklad_order_id: str | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class AdminOrderStatusHistoryEntry:
    id: UUID
    from_status: str | None
    to_status: str
    changed_by: str
    reason: str | None
    changed_at: datetime


class IAdminOrdersRepository(ABC):
    @abstractmethod
    async def list_orders(
        self,
        *,
        page: int,
        limit: int,
        status: OrderStatus | None,
    ) -> tuple[list[AdminOrderListRow], int]:
        ...

    @abstractmethod
    async def get_order_detail(
        self,
        order_number: str,
    ) -> tuple[Order, list[OrderLine], list[AdminOrderStatusHistoryEntry], str | None] | None:
        ...

    @abstractmethod
    async def update_order_status(
        self,
        *,
        order_number: str,
        new_status: OrderStatus,
        changed_by: str,
        reason: str | None,
    ) -> tuple[Order, list[OrderLine], list[AdminOrderStatusHistoryEntry], str | None]:
        ...
