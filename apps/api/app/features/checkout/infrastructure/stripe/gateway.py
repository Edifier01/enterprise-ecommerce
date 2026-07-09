"""Stripe PaymentIntent and webhook adapter."""

import logging

import stripe

from app.core.config import settings
from app.features.checkout.domain.entities import PaymentIntentResult
from app.features.checkout.domain.ports import (
    IStripeGateway,
    StripeGatewayError,
    WebhookVerificationError,
)

logger = logging.getLogger(__name__)


class StripeGateway(IStripeGateway):
    def __init__(self) -> None:
        secret = settings.stripe_secret_key.get_secret_value()
        if secret:
            stripe.api_key = secret

    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str,
        idempotency_key: str,
        metadata: dict[str, str],
    ) -> PaymentIntentResult:
        secret = settings.stripe_secret_key.get_secret_value()
        if not secret:
            raise StripeGatewayError("Stripe is not configured")

        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency.lower(),
                automatic_payment_methods={"enabled": True},
                metadata=metadata,
                idempotency_key=idempotency_key,
            )
        except stripe.StripeError as exc:
            logger.warning("Stripe PaymentIntent creation failed: %s", type(exc).__name__)
            raise StripeGatewayError("Payment intent creation failed") from exc

        return PaymentIntentResult(
            payment_intent_id=intent.id,
            client_secret=intent.client_secret,
        )

    async def retrieve_client_secret(self, payment_intent_id: str) -> str:
        secret = settings.stripe_secret_key.get_secret_value()
        if not secret:
            raise StripeGatewayError("Stripe is not configured")
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        except stripe.StripeError as exc:
            logger.warning("Stripe PaymentIntent retrieve failed: %s", type(exc).__name__)
            raise StripeGatewayError("Payment intent retrieval failed") from exc
        if not intent.client_secret:
            raise StripeGatewayError("Payment intent has no client secret")
        return intent.client_secret

    def construct_webhook_event(
        self, payload: bytes, signature_header: str | None
    ) -> dict:
        webhook_secret = settings.stripe_webhook_secret.get_secret_value()
        if not webhook_secret:
            raise WebhookVerificationError("Webhook secret is not configured")
        if not signature_header:
            raise WebhookVerificationError("Missing Stripe-Signature header")

        try:
            event = stripe.Webhook.construct_event(
                payload, signature_header, webhook_secret
            )
        except ValueError as exc:
            raise WebhookVerificationError("Invalid webhook payload") from exc
        except stripe.SignatureVerificationError as exc:
            raise WebhookVerificationError("Invalid webhook signature") from exc

        return dict(event)
