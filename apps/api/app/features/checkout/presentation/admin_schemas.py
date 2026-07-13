"""Admin orders API schemas."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field

from app.features.checkout.presentation.schemas import OrderLineSchema


class AdminOrderStatusMutation(StrEnum):
    SHIPPED = "shipped"
    CANCELED = "canceled"


class AdminOrderStatusFilter(StrEnum):
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    CANCELED = "canceled"


class AdminOrderSummarySchema(BaseModel):
    id: UUID
    order_number: str
    status: str
    currency: str
    total_cents: int
    customer_email: str | None
    created_at: datetime


class AdminOrderStatusHistorySchema(BaseModel):
    id: UUID
    from_status: str | None
    to_status: str
    changed_by: str
    reason: str | None
    changed_at: datetime


class AdminOrderDetailSchema(BaseModel):
    id: UUID
    order_number: str
    status: str
    currency: str
    subtotal_cents: int
    discount_cents: int
    shipping_cents: int
    tax_cents: int
    total_cents: int
    customer_email: str | None
    created_at: datetime
    updated_at: datetime
    lines: list[OrderLineSchema]
    status_history: list[AdminOrderStatusHistorySchema]


class AdminOrderListResponse(BaseModel):
    items: list[AdminOrderSummarySchema]
    total: int
    page: int
    limit: int


class AdminUpdateOrderStatusRequest(BaseModel):
    status: AdminOrderStatusMutation
    reason: str | None = Field(default=None, max_length=500)
