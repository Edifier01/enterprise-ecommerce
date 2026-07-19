"""Public MoySklad webhook endpoint (inbound notifications only)."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.features.checkout.presentation.dependencies import get_inventory_service
from app.features.integrations.moysklad.application.webhook_handler import process_webhook_payload
from app.features.inventory.application.inventory_service import InventoryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/moysklad", tags=["integrations"])


class WebhookAckResponse(BaseModel):
    status: str
    processed: int
    skipped: int


def _verify_webhook_secret(provided: str | None) -> None:
    expected = settings.moysklad_webhook_secret.get_secret_value()
    if not expected:
        return
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


@router.post("/webhook", response_model=WebhookAckResponse, operation_id="moySkladWebhook")
async def moysklad_webhook(
    request: Request,
    secret: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
    inventory_service: InventoryService = Depends(get_inventory_service),
) -> WebhookAckResponse:
    """Receive MoySklad change notifications. Site pulls updates — never writes to MS."""
    header_secret = request.headers.get("X-MoySklad-Webhook-Secret")
    _verify_webhook_secret(secret or header_secret)

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Webhook payload must be a JSON object")

    result = await process_webhook_payload(
        session,
        payload,
        inventory_service=inventory_service,
    )
    await session.commit()

    return WebhookAckResponse(
        status="ok" if not result.errors else "partial",
        processed=result.processed,
        skipped=result.skipped,
    )
