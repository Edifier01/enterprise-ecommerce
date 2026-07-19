"""Handle incoming MoySklad webhook notifications (inbound only)."""

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.integrations.moysklad.application.sync_entity import run_entity_sync
from app.features.integrations.moysklad.application.sync_order_return import run_order_return_sync
from app.features.integrations.moysklad.infrastructure.persistence.sync_repository import (
    SyncStateRepository,
)
from app.features.inventory.application.inventory_service import InventoryService

logger = logging.getLogger(__name__)

_HREF_ID_RE = re.compile(r"/([0-9a-f-]{36})(?:\?|$)", re.IGNORECASE)

_SUPPORTED_TYPES = frozenset({"product", "variant", "customerorder"})


@dataclass(frozen=True, slots=True)
class WebhookProcessResult:
    processed: int
    skipped: int
    errors: list[str]


def parse_webhook_events(payload: dict[str, Any]) -> list[dict[str, str]]:
    events: list[dict[str, str]] = []
    for raw in payload.get("events") or []:
        meta = raw.get("meta") or {}
        entity_type = meta.get("type") or ""
        href = meta.get("href") or ""
        match = _HREF_ID_RE.search(href)
        if not match or entity_type not in _SUPPORTED_TYPES:
            continue
        events.append(
            {
                "entity_type": entity_type,
                "entity_id": match.group(1),
                "action": (raw.get("action") or "UPDATE").upper(),
                "account_id": raw.get("accountId") or "",
            }
        )
    return events


def event_dedup_key(event: dict[str, str]) -> str:
    raw = json.dumps(event, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()


async def process_webhook_payload(
    session: AsyncSession,
    payload: dict[str, Any],
    *,
    inventory_service: InventoryService | None = None,
) -> WebhookProcessResult:
    sync_repo = SyncStateRepository(session)
    state = await sync_repo.get_state()
    if not state.webhooks_enabled:
        logger.info("moysklad_webhook_ignored_webhooks_disabled")
        return WebhookProcessResult(processed=0, skipped=0, errors=[])

    processed = 0
    skipped = 0
    errors: list[str] = []

    for event in parse_webhook_events(payload):
        dedup = event_dedup_key(event)
        if await sync_repo.has_recent_webhook(dedup):
            skipped += 1
            continue
        try:
            if event["entity_type"] == "customerorder":
                if inventory_service is None:
                    skipped += 1
                    continue
                outcome = await run_order_return_sync(
                    session,
                    ms_order_id=event["entity_id"],
                    action=event["action"],
                    inventory_service=inventory_service,
                )
                handled = outcome.handled
            else:
                entity_outcome = await run_entity_sync(
                    session,
                    entity_type=event["entity_type"],
                    entity_id=event["entity_id"],
                    action=event["action"],
                )
                handled = entity_outcome.handled

            if handled:
                processed += 1
                await sync_repo.log_event(
                    direction="inbound",
                    entity_type="webhook",
                    entity_id=dedup,
                    status="success",
                    payload_hash=dedup,
                )
            else:
                skipped += 1
        except Exception as exc:
            message = f"{event['entity_type']}:{event['entity_id']}: {exc}"
            logger.exception("moysklad_webhook_event_failed")
            errors.append(message)
            await sync_repo.log_event(
                direction="inbound",
                entity_type="webhook",
                entity_id=dedup,
                status="error",
                payload_hash=dedup,
                error_message=message,
            )

    return WebhookProcessResult(processed=processed, skipped=skipped, errors=errors)
