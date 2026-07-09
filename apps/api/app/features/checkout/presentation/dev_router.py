"""Development-only checkout helpers — gated away from production."""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.features.checkout.application.webhook_service import WebhookService
from app.features.checkout.domain.ports import ICheckoutRepository, WebhookVerificationError
from app.features.checkout.presentation.dependencies import get_checkout_repository, get_webhook_service
from app.features.checkout.presentation.schemas import WebhookResponse

router = APIRouter(tags=["dev"])


@router.post(
    "/dev/payments/{payment_intent_id}/simulate-success",
    response_model=WebhookResponse,
    operation_id="simulateStubPaymentSuccess",
    include_in_schema=settings.environment != "production",
)
async def simulate_stub_payment_success(
    payment_intent_id: str,
    webhook_service: WebhookService = Depends(get_webhook_service),
    repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> WebhookResponse:
    if settings.environment == "production":
        raise HTTPException(status_code=404, detail="Not found")
    if settings.get_payment_provider() != "stub":
        raise HTTPException(status_code=404, detail="Stub payments are not enabled")

    payment = await repo.get_payment_record_by_stripe_pi_id(payment_intent_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    event = {
        "id": f"evt_stub_{uuid.uuid4().hex}",
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": payment_intent_id,
                "amount": payment.amount_cents,
                "amount_received": payment.amount_cents,
                "currency": payment.currency.lower(),
                "latest_charge": "ch_stub_123",
                "payment_method": "pm_stub",
                "payment_method_types": ["card"],
            }
        },
    }
    payload = json.dumps(event).encode("utf-8")

    try:
        result = await webhook_service.handle_stripe_webhook(payload, "stub")
    except WebhookVerificationError as exc:
        raise HTTPException(status_code=400, detail="Webhook processing failed") from exc

    return WebhookResponse(status=result["status"])
