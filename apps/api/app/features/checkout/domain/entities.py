"""Checkout domain entities and value objects."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from uuid import UUID


class CartStatus(StrEnum):
    ACTIVE = "active"
    CONVERTED = "converted"
    ABANDONED = "abandoned"


class CheckoutSessionStatus(StrEnum):
    OPEN = "open"
    PAYMENT_PENDING = "payment_pending"
    COMPLETED = "completed"
    EXPIRED = "expired"
    CANCELED = "canceled"


class PaymentRecordStatus(StrEnum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


class OrderStatus(StrEnum):
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    CANCELED = "canceled"


@dataclass(frozen=True)
class ProductSnapshot:
    variant_id: UUID
    sku: str
    name: str
    product_id: UUID
    product_name: str
    product_slug: str
    attributes: dict[str, str]
    price_cents: int
    currency: str
    price_tier: str = "retail"

    def to_dict(self) -> dict:
        return {
            "variant_id": str(self.variant_id),
            "sku": self.sku,
            "name": self.name,
            "product_id": str(self.product_id),
            "product_name": self.product_name,
            "product_slug": self.product_slug,
            "attributes": self.attributes,
            "price_cents": self.price_cents,
            "currency": self.currency,
            "price_tier": self.price_tier,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ProductSnapshot":
        return cls(
            variant_id=UUID(data["variant_id"]),
            sku=data["sku"],
            name=data["name"],
            product_id=UUID(data["product_id"]),
            product_name=data["product_name"],
            product_slug=data["product_slug"],
            attributes=data.get("attributes", {}),
            price_cents=data["price_cents"],
            currency=data["currency"],
            price_tier=data.get("price_tier", "retail"),
        )


@dataclass
class CartLine:
    id: UUID
    cart_id: UUID
    variant_id: UUID
    quantity: int
    unit_price_cents: int
    currency: str
    product_snapshot: ProductSnapshot
    created_at: datetime
    updated_at: datetime


@dataclass
class Cart:
    id: UUID
    session_token: str | None
    user_id: UUID | None
    status: CartStatus
    lines: list[CartLine] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @property
    def subtotal_cents(self) -> int:
        return sum(line.unit_price_cents * line.quantity for line in self.lines)

    @property
    def currency(self) -> str | None:
        if not self.lines:
            return None
        return self.lines[0].currency

    @property
    def is_empty(self) -> bool:
        return len(self.lines) == 0


@dataclass(frozen=True)
class CheckoutSessionLine:
    """Immutable line snapshot frozen at checkout session creation."""

    id: UUID
    checkout_session_id: UUID
    variant_id: UUID
    quantity: int
    unit_price_cents: int
    currency: str
    product_snapshot: ProductSnapshot

    @property
    def line_total_cents(self) -> int:
        return self.unit_price_cents * self.quantity


@dataclass(frozen=True)
class OrderShippingDetails:
    recipient_name: str
    phone: str
    address: str


@dataclass
class CheckoutSession:
    id: UUID
    cart_id: UUID
    user_id: UUID | None
    status: CheckoutSessionStatus
    currency: str
    subtotal_cents: int
    total_cents: int
    created_at: datetime
    updated_at: datetime
    idempotency_key: str | None = None
    stripe_payment_intent_id: str | None = None
    shipping_recipient_name: str | None = None
    shipping_phone: str | None = None
    shipping_address: str | None = None


@dataclass
class PaymentRecord:
    id: UUID
    checkout_session_id: UUID
    order_id: UUID | None
    stripe_payment_intent_id: str
    stripe_charge_id: str | None
    amount_cents: int
    currency: str
    status: PaymentRecordStatus
    idempotency_key: str
    failure_code: str | None
    failure_message: str | None
    payment_method_summary: dict | None
    created_at: datetime
    updated_at: datetime


@dataclass
class Order:
    id: UUID
    order_number: str
    checkout_session_id: UUID
    customer_id: UUID | None
    guest_email: str | None
    status: OrderStatus
    currency: str
    subtotal_cents: int
    discount_cents: int
    shipping_cents: int
    tax_cents: int
    total_cents: int
    payment_record_id: UUID
    created_at: datetime
    updated_at: datetime
    shipping_recipient_name: str | None = None
    shipping_phone: str | None = None
    shipping_address: str | None = None
    moysklad_order_id: str | None = None


@dataclass(frozen=True)
class OrderLine:
    id: UUID
    order_id: UUID
    variant_id: UUID
    quantity: int
    unit_price_cents: int
    line_total_cents: int
    product_snapshot: ProductSnapshot


@dataclass(frozen=True)
class PaymentIntentResult:
    payment_intent_id: str
    client_secret: str
