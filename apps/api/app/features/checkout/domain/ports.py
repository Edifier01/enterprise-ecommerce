"""Checkout domain ports — repository and gateway interfaces."""

from abc import ABC, abstractmethod
from uuid import UUID

from app.features.checkout.domain.entities import (
    Cart,
    CartLine,
    CheckoutSession,
    CheckoutSessionLine,
    Order,
    OrderLine,
    OrderShippingDetails,
    PaymentIntentResult,
    PaymentRecord,
    ProductSnapshot,
)


class ICheckoutRepository(ABC):
    @abstractmethod
    async def get_variant_with_product(self, variant_id: UUID) -> tuple | None:
        """Return (variant_model, product_model) or None."""

    @abstractmethod
    async def get_active_cart_by_session_token(self, session_token: str) -> Cart | None:
        pass

    @abstractmethod
    async def get_active_cart_by_user_id(self, user_id: UUID) -> Cart | None:
        pass

    @abstractmethod
    async def create_cart(self, session_token: str | None, user_id: UUID | None) -> Cart:
        pass

    @abstractmethod
    async def get_cart_by_id(self, cart_id: UUID) -> Cart | None:
        pass

    @abstractmethod
    async def get_cart_line(self, line_id: UUID) -> CartLine | None:
        pass

    @abstractmethod
    async def upsert_cart_line(
        self,
        cart_id: UUID,
        variant_id: UUID,
        quantity: int,
        unit_price_cents: int,
        currency: str,
        snapshot: ProductSnapshot,
    ) -> CartLine:
        pass

    @abstractmethod
    async def update_cart_line_quantity(self, line_id: UUID, quantity: int) -> CartLine | None:
        pass

    @abstractmethod
    async def delete_cart_line(self, line_id: UUID) -> bool:
        pass

    @abstractmethod
    async def mark_cart_converted(self, cart_id: UUID) -> None:
        pass

    @abstractmethod
    async def get_checkout_session_by_id(self, session_id: UUID) -> CheckoutSession | None:
        pass

    @abstractmethod
    async def get_checkout_session_by_idempotency_key(
        self, idempotency_key: str
    ) -> CheckoutSession | None:
        pass

    @abstractmethod
    async def create_checkout_session(
        self,
        cart_id: UUID,
        user_id: UUID | None,
        currency: str,
        subtotal_cents: int,
        total_cents: int,
        idempotency_key: str | None,
        shipping: OrderShippingDetails | None = None,
    ) -> CheckoutSession:
        pass

    @abstractmethod
    async def create_checkout_session_lines(
        self,
        checkout_session_id: UUID,
        lines: list[tuple[UUID, int, int, str, ProductSnapshot]],
    ) -> list[CheckoutSessionLine]:
        pass

    @abstractmethod
    async def get_checkout_session_lines(
        self, checkout_session_id: UUID
    ) -> list[CheckoutSessionLine]:
        pass

    @abstractmethod
    async def update_checkout_session_status(
        self, session_id: UUID, status: str, stripe_payment_intent_id: str | None = None
    ) -> None:
        pass

    @abstractmethod
    async def get_payment_record_by_idempotency_key(
        self, idempotency_key: str
    ) -> PaymentRecord | None:
        pass

    @abstractmethod
    async def get_payment_record_by_stripe_pi_id(
        self, stripe_payment_intent_id: str
    ) -> PaymentRecord | None:
        pass

    @abstractmethod
    async def get_payment_record_by_checkout_session(
        self, checkout_session_id: UUID
    ) -> PaymentRecord | None:
        pass

    @abstractmethod
    async def create_payment_record(
        self,
        checkout_session_id: UUID,
        stripe_payment_intent_id: str,
        amount_cents: int,
        currency: str,
        idempotency_key: str,
    ) -> PaymentRecord:
        pass

    @abstractmethod
    async def update_payment_record(
        self,
        payment_record_id: UUID,
        status: str,
        stripe_charge_id: str | None = None,
        failure_code: str | None = None,
        failure_message: str | None = None,
        payment_method_summary: dict | None = None,
        order_id: UUID | None = None,
    ) -> None:
        pass

    @abstractmethod
    async def is_webhook_event_processed(self, stripe_event_id: str) -> bool:
        pass

    @abstractmethod
    async def mark_webhook_event_processed(self, stripe_event_id: str, event_type: str) -> None:
        pass

    @abstractmethod
    async def get_order_by_checkout_session(self, checkout_session_id: UUID) -> Order | None:
        pass

    @abstractmethod
    async def list_orders_by_customer(
        self,
        customer_id: UUID,
        page: int,
        limit: int,
    ) -> tuple[list[Order], int]:
        pass

    @abstractmethod
    async def get_order_with_lines_by_number_for_customer(
        self,
        order_number: str,
        customer_id: UUID,
    ) -> tuple[Order, list[OrderLine]] | None:
        pass

    @abstractmethod
    async def create_order(
        self,
        order_number: str,
        checkout_session_id: UUID,
        customer_id: UUID | None,
        guest_email: str | None,
        currency: str,
        subtotal_cents: int,
        total_cents: int,
        payment_record_id: UUID,
        lines: list[tuple[UUID, int, int, int, ProductSnapshot]],
        shipping: OrderShippingDetails | None = None,
    ) -> Order:
        pass

    @abstractmethod
    async def merge_guest_cart_into_user_cart(
        self, guest_session_token: str, user_id: UUID
    ) -> Cart:
        pass

    @abstractmethod
    async def commit(self) -> None:
        pass


class WebhookVerificationError(Exception):
    """Raised when Stripe webhook signature verification fails."""


class StripeGatewayError(Exception):
    """Raised when Stripe API call fails."""


class IStripeGateway(ABC):
    @abstractmethod
    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str,
        idempotency_key: str,
        metadata: dict[str, str],
    ) -> PaymentIntentResult:
        pass

    @abstractmethod
    async def retrieve_client_secret(self, payment_intent_id: str) -> str:
        pass

    @abstractmethod
    def construct_webhook_event(
        self, payload: bytes, signature_header: str | None
    ) -> dict:
        pass
