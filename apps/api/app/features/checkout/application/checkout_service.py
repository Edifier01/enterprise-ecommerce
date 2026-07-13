"""Checkout session and payment intent application service."""

import uuid

from app.features.checkout.domain.entities import (
    Cart,
    CheckoutSession,
    CheckoutSessionStatus,
)
from app.features.checkout.domain.ports import ICheckoutRepository, IStripeGateway, StripeGatewayError
from app.features.checkout.application.cart_service import CartService
from app.features.inventory.application.inventory_service import InventoryService
from app.features.inventory.domain.entities import InventoryReservationRequestLine


class CheckoutSessionNotFoundError(Exception):
    pass


class EmptyCartError(Exception):
    pass


class CheckoutService:
    def __init__(
        self,
        repo: ICheckoutRepository,
        cart_service: CartService,
        stripe_gateway: IStripeGateway,
        inventory_service: InventoryService,
    ) -> None:
        self._repo = repo
        self._cart_service = cart_service
        self._stripe = stripe_gateway
        self._inventory_service = inventory_service

    async def create_checkout_session(
        self,
        cart: Cart,
        user_id: uuid.UUID | None,
        idempotency_key: str | None,
        *,
        is_wholesaler: bool = False,
    ) -> CheckoutSession:
        if idempotency_key:
            existing = await self._repo.get_checkout_session_by_idempotency_key(idempotency_key)
            if existing is not None:
                lines = await self._repo.get_checkout_session_lines(existing.id)
                await self._inventory_service.reaffirm_checkout_session(
                    existing.id,
                    [
                        InventoryReservationRequestLine(line.variant_id, line.quantity)
                        for line in lines
                    ],
                )
                return existing

        cart = await self._cart_service.validate_cart_for_checkout(cart, is_wholesaler=is_wholesaler)

        subtotal = cart.subtotal_cents
        currency = cart.currency
        if currency is None:
            raise EmptyCartError("Cart has no currency")

        session = await self._repo.create_checkout_session(
            cart_id=cart.id,
            user_id=user_id,
            currency=currency,
            subtotal_cents=subtotal,
            total_cents=subtotal,
            idempotency_key=idempotency_key,
        )

        line_snapshots = [
            (
                line.variant_id,
                line.quantity,
                line.unit_price_cents,
                line.currency,
                line.product_snapshot,
            )
            for line in cart.lines
        ]
        created_lines = await self._repo.create_checkout_session_lines(session.id, line_snapshots)
        await self._inventory_service.reserve_checkout_session(
            session.id,
            [
                InventoryReservationRequestLine(line.variant_id, line.quantity)
                for line in created_lines
            ],
        )

        return session

    async def verify_session_access(
        self,
        session: CheckoutSession,
        user_id: uuid.UUID | None,
        cart_session_token: str | None,
    ) -> None:
        """Reject access when session does not belong to the current requester."""
        cart = await self._repo.get_cart_by_id(session.cart_id)
        if cart is None:
            raise CheckoutSessionNotFoundError("Checkout session not found")

        if user_id is not None:
            if session.user_id == user_id or cart.user_id == user_id:
                return
            raise CheckoutSessionNotFoundError("Checkout session not found")

        if cart_session_token and cart.session_token == cart_session_token:
            return

        raise CheckoutSessionNotFoundError("Checkout session not found")

    async def get_checkout_session(
        self,
        session_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        cart_session_token: str | None = None,
    ) -> CheckoutSession:
        session = await self._repo.get_checkout_session_by_id(session_id)
        if session is None:
            raise CheckoutSessionNotFoundError("Checkout session not found")
        await self.verify_session_access(session, user_id, cart_session_token)
        return session

    async def create_payment_intent(
        self,
        session_id: uuid.UUID,
        idempotency_key: str,
        user_id: uuid.UUID | None = None,
        cart_session_token: str | None = None,
        *,
        is_wholesaler: bool = False,
    ) -> tuple[str, str]:
        session = await self.get_checkout_session(
            session_id,
            user_id=user_id,
            cart_session_token=cart_session_token,
        )

        if session.status == CheckoutSessionStatus.COMPLETED:
            raise ValueError("Checkout session already completed")

        existing_payment = await self._repo.get_payment_record_by_idempotency_key(idempotency_key)
        if existing_payment is not None:
            if existing_payment.checkout_session_id != session_id:
                raise ValueError("Idempotency key already used for a different session")
            client_secret = await self._stripe.retrieve_client_secret(
                existing_payment.stripe_payment_intent_id
            )
            return client_secret, existing_payment.stripe_payment_intent_id

        cart = await self._repo.get_cart_by_id(session.cart_id)
        if cart is None:
            raise CheckoutSessionNotFoundError("Cart not found")

        cart = await self._cart_service.validate_cart_for_checkout(cart, is_wholesaler=is_wholesaler)

        if cart.subtotal_cents != session.total_cents or cart.currency != session.currency:
            raise ValueError("Cart total changed after checkout session creation")

        session_lines = await self._repo.get_checkout_session_lines(session.id)
        await self._inventory_service.reaffirm_checkout_session(
            session.id,
            [
                InventoryReservationRequestLine(line.variant_id, line.quantity)
                for line in session_lines
            ],
        )

        try:
            result = await self._stripe.create_payment_intent(
                amount_cents=session.total_cents,
                currency=session.currency,
                idempotency_key=idempotency_key,
                metadata={
                    "checkout_session_id": str(session_id),
                    "cart_id": str(session.cart_id),
                },
            )
        except StripeGatewayError:
            raise

        await self._repo.create_payment_record(
            checkout_session_id=session_id,
            stripe_payment_intent_id=result.payment_intent_id,
            amount_cents=session.total_cents,
            currency=session.currency,
            idempotency_key=idempotency_key,
        )
        await self._repo.update_checkout_session_status(
            session_id,
            CheckoutSessionStatus.PAYMENT_PENDING.value,
            stripe_payment_intent_id=result.payment_intent_id,
        )

        return result.client_secret, result.payment_intent_id
