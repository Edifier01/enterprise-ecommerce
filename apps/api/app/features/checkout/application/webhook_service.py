"""Stripe webhook processing — order creation on payment_intent.succeeded."""

import logging
import uuid

from app.features.checkout.domain.entities import (
    CheckoutSessionStatus,
    PaymentRecordStatus,
)
from app.features.checkout.domain.ports import ICheckoutRepository, IStripeGateway, WebhookVerificationError
from app.features.checkout.infrastructure.persistence.repository import _generate_order_number
from app.features.inventory.application.inventory_service import (
    InventoryReservationMissingError,
    InventoryService,
)

logger = logging.getLogger(__name__)


class WebhookService:
    HANDLED_EVENTS = {
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
        "payment_intent.canceled",
    }

    def __init__(
        self,
        repo: ICheckoutRepository,
        stripe_gateway: IStripeGateway,
        inventory_service: InventoryService,
    ) -> None:
        self._repo = repo
        self._stripe = stripe_gateway
        self._inventory_service = inventory_service

    async def handle_stripe_webhook(
        self, payload: bytes, signature_header: str | None
    ) -> dict[str, str]:
        try:
            event = self._stripe.construct_webhook_event(payload, signature_header)
        except WebhookVerificationError:
            raise

        event_id = event.get("id", "")
        event_type = event.get("type", "")

        if not event_id:
            raise WebhookVerificationError("Missing event id")

        if await self._repo.is_webhook_event_processed(event_id):
            return {"status": "already_processed"}

        if event_type not in self.HANDLED_EVENTS:
            await self._repo.mark_webhook_event_processed(event_id, event_type)
            await self._repo.commit()
            return {"status": "ignored"}

        data_object = event.get("data", {}).get("object", {})
        payment_intent_id = data_object.get("id", "")

        if event_type == "payment_intent.succeeded":
            await self._handle_payment_succeeded(payment_intent_id, data_object)
        elif event_type == "payment_intent.payment_failed":
            await self._handle_payment_failed(payment_intent_id, data_object)
        elif event_type == "payment_intent.canceled":
            await self._handle_payment_canceled(payment_intent_id)

        await self._repo.mark_webhook_event_processed(event_id, event_type)
        await self._repo.commit()
        return {"status": "processed"}

    async def _handle_payment_succeeded(
        self, payment_intent_id: str, data_object: dict
    ) -> None:
        payment = await self._repo.get_payment_record_by_stripe_pi_id(payment_intent_id)
        if payment is None:
            logger.warning("Payment record not found for PI %s", payment_intent_id)
            return

        if payment.status == PaymentRecordStatus.SUCCEEDED:
            return

        session = await self._repo.get_checkout_session_by_id(payment.checkout_session_id)
        if session is None:
            return

        existing_order = await self._repo.get_order_by_checkout_session(session.id)
        if existing_order is not None:
            await self._repo.update_payment_record(
                payment.id,
                PaymentRecordStatus.SUCCEEDED.value,
                stripe_charge_id=self._extract_charge_id(data_object),
                payment_method_summary=self._extract_payment_method_summary(data_object),
                order_id=existing_order.id,
            )
            return

        paid_amount, paid_currency = self._extract_paid_amount_and_currency(data_object)
        if paid_amount is None or not paid_currency:
            logger.critical(
                "Captured payment %s requires manual review: missing amount/currency in webhook payload",
                payment_intent_id,
            )
            await self._mark_payment_amount_mismatch(
                payment.id,
                payment_intent_id,
                expected_amount=payment.amount_cents,
                expected_currency=payment.currency,
                paid_amount=paid_amount,
                paid_currency=paid_currency,
            )
            return

        if (
            paid_amount != payment.amount_cents
            or paid_currency.lower() != payment.currency.lower()
        ):
            logger.critical(
                "Captured payment %s requires manual review: expected %s %s, got %s %s",
                payment_intent_id,
                payment.amount_cents,
                payment.currency,
                paid_amount,
                paid_currency,
            )
            await self._mark_payment_amount_mismatch(
                payment.id,
                payment_intent_id,
                expected_amount=payment.amount_cents,
                expected_currency=payment.currency,
                paid_amount=paid_amount,
                paid_currency=paid_currency,
            )
            return

        session_lines = await self._repo.get_checkout_session_lines(session.id)
        if not session_lines:
            logger.critical(
                "Captured payment %s requires manual review: checkout session %s has no frozen line snapshots",
                payment_intent_id,
                session.id,
            )
            await self._repo.update_payment_record(
                payment.id,
                PaymentRecordStatus.FAILED.value,
                failure_code="missing_line_snapshots",
                failure_message=(
                    "Captured payment cannot create order: checkout session has no "
                    "frozen line snapshots. Manual refund or fulfillment review required."
                ),
            )
            return

        subtotal_cents = sum(line.line_total_cents for line in session_lines)
        if subtotal_cents != session.total_cents:
            logger.critical(
                "Captured payment %s requires manual review: frozen line subtotal %s does not match session total %s for session %s",
                payment_intent_id,
                subtotal_cents,
                session.total_cents,
                session.id,
            )
            await self._repo.update_payment_record(
                payment.id,
                PaymentRecordStatus.FAILED.value,
                failure_code="line_total_mismatch",
                failure_message=(
                    f"Captured payment cannot create order: frozen line subtotal "
                    f"{subtotal_cents} does not match session total {session.total_cents}. "
                    "Manual refund or fulfillment review required."
                ),
            )
            return

        charge_id = self._extract_charge_id(data_object)
        pm_summary = self._extract_payment_method_summary(data_object)

        order_number = self._generate_order_number()
        order_lines = [
            (
                line.variant_id,
                line.quantity,
                line.unit_price_cents,
                line.line_total_cents,
                line.product_snapshot,
            )
            for line in session_lines
        ]

        try:
            await self._inventory_service.deduct_checkout_session(session.id)
        except InventoryReservationMissingError:
            logger.critical(
                "Captured payment %s requires manual review: inventory reservation missing for session %s",
                payment_intent_id,
                session.id,
            )
            await self._repo.update_payment_record(
                payment.id,
                PaymentRecordStatus.FAILED.value,
                failure_code="inventory_reservation_missing",
                failure_message=(
                    "Captured payment cannot create order: inventory reservation is missing. "
                    "Manual refund or fulfillment review required."
                ),
            )
            return

        order = await self._repo.create_order(
            order_number=order_number,
            checkout_session_id=session.id,
            customer_id=session.user_id,
            guest_email=None,
            currency=session.currency,
            subtotal_cents=subtotal_cents,
            total_cents=session.total_cents,
            payment_record_id=payment.id,
            lines=order_lines,
        )

        await self._repo.update_payment_record(
            payment.id,
            PaymentRecordStatus.SUCCEEDED.value,
            stripe_charge_id=charge_id,
            payment_method_summary=pm_summary,
            order_id=order.id,
        )
        await self._repo.update_checkout_session_status(
            session.id, CheckoutSessionStatus.COMPLETED.value
        )
        await self._repo.mark_cart_converted(session.cart_id)

    async def _mark_payment_amount_mismatch(
        self,
        payment_id: uuid.UUID,
        payment_intent_id: str,
        *,
        expected_amount: int,
        expected_currency: str,
        paid_amount: int | None,
        paid_currency: str | None,
    ) -> None:
        logger.critical(
            "Captured payment %s requires manual review: expected %s %s, got %s %s",
            payment_intent_id,
            expected_amount,
            expected_currency,
            paid_amount,
            paid_currency,
        )
        await self._repo.update_payment_record(
            payment_id,
            PaymentRecordStatus.FAILED.value,
            failure_code="amount_mismatch",
            failure_message=(
                f"Captured payment cannot create order: Stripe reported "
                f"{paid_amount} {paid_currency}; expected {expected_amount} "
                f"{expected_currency}. Manual refund or fulfillment review required."
            ),
        )

    async def _handle_payment_failed(
        self, payment_intent_id: str, data_object: dict
    ) -> None:
        payment = await self._repo.get_payment_record_by_stripe_pi_id(payment_intent_id)
        if payment is None:
            return

        last_error = data_object.get("last_payment_error") or {}
        await self._repo.update_payment_record(
            payment.id,
            PaymentRecordStatus.FAILED.value,
            failure_code=last_error.get("code"),
            failure_message=last_error.get("message"),
        )
        await self._repo.update_checkout_session_status(
            payment.checkout_session_id, CheckoutSessionStatus.CANCELED.value
        )
        await self._inventory_service.release_checkout_session(payment.checkout_session_id)

    async def _handle_payment_canceled(self, payment_intent_id: str) -> None:
        payment = await self._repo.get_payment_record_by_stripe_pi_id(payment_intent_id)
        if payment is None:
            return

        await self._repo.update_payment_record(
            payment.id, PaymentRecordStatus.CANCELED.value
        )
        await self._repo.update_checkout_session_status(
            payment.checkout_session_id, CheckoutSessionStatus.CANCELED.value
        )
        await self._inventory_service.release_checkout_session(payment.checkout_session_id)

    @staticmethod
    def _extract_charge_id(data_object: dict) -> str | None:
        charges = data_object.get("latest_charge")
        if isinstance(charges, str):
            return charges
        return None

    @staticmethod
    def _extract_payment_method_summary(data_object: dict) -> dict | None:
        pm = data_object.get("payment_method")
        if not pm:
            return None
        return {"type": data_object.get("payment_method_types", ["card"])[0] if data_object.get("payment_method_types") else "card"}

    @staticmethod
    def _extract_paid_amount_and_currency(data_object: dict) -> tuple[int | None, str | None]:
        amount = data_object.get("amount_received")
        if amount is None:
            amount = data_object.get("amount")
        currency = data_object.get("currency")
        if amount is None or currency is None:
            return None, None
        return int(amount), str(currency)

    @staticmethod
    def _generate_order_number() -> str:
        return _generate_order_number()
