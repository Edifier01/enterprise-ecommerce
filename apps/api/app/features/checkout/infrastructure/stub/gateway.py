"""Dev/test payment gateway — no external provider."""

import json
import uuid

from app.features.checkout.domain.entities import PaymentIntentResult
from app.features.checkout.domain.ports import IStripeGateway, WebhookVerificationError


class StubPaymentGateway(IStripeGateway):
    """In-memory payment adapter for development and automated tests."""

    def __init__(self) -> None:
        self._secrets: dict[str, str] = {}

    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str,
        idempotency_key: str,
        metadata: dict[str, str],
    ) -> PaymentIntentResult:
        del amount_cents, currency, idempotency_key, metadata
        payment_intent_id = f"pi_stub_{uuid.uuid4().hex[:16]}"
        client_secret = f"{payment_intent_id}_secret_stub"
        self._secrets[payment_intent_id] = client_secret
        return PaymentIntentResult(
            payment_intent_id=payment_intent_id,
            client_secret=client_secret,
        )

    async def retrieve_client_secret(self, payment_intent_id: str) -> str:
        return self._secrets.get(
            payment_intent_id,
            f"{payment_intent_id}_secret_stub",
        )

    def construct_webhook_event(
        self, payload: bytes, signature_header: str | None
    ) -> dict:
        del signature_header
        try:
            event = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise WebhookVerificationError("Invalid webhook payload") from exc
        if not isinstance(event, dict):
            raise WebhookVerificationError("Invalid webhook payload")
        return event
