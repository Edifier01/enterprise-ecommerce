"""Checkout API request/response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CartLineSchema(BaseModel):
    id: UUID
    variant_id: UUID
    quantity: int
    unit_price_cents: int
    line_total_cents: int
    currency: str
    product_snapshot: dict

    model_config = {"from_attributes": True}


class CartResponse(BaseModel):
    id: UUID
    status: str
    currency: str | None
    subtotal_cents: int
    total_cents: int
    lines: list[CartLineSchema]
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AddCartLineRequest(BaseModel):
    variant_id: UUID
    quantity: int = Field(gt=0)


class UpdateCartLineRequest(BaseModel):
    quantity: int = Field(ge=0)


class CheckoutSessionResponse(BaseModel):
    id: UUID
    cart_id: UUID
    status: str
    currency: str
    subtotal_cents: int
    total_cents: int
    order_number: str | None = None
    created_at: datetime
    updated_at: datetime


class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str


class WebhookResponse(BaseModel):
    status: str
