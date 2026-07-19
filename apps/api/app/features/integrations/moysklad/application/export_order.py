"""Export paid site orders to MoySklad as customer orders (ADR-010 §12)."""

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.features.integrations.moysklad.domain.order_export_ports import (
    IMoySkladOrderExportClient,
)
from app.features.integrations.moysklad.infrastructure.outbound_client import (
    build_moysklad_outbound_client,
)
from app.features.integrations.moysklad.infrastructure.persistence.order_export_repository import (
    OrderExportRepository,
)
from app.features.integrations.moysklad.infrastructure.persistence.sync_repository import (
    SyncStateRepository,
)

logger = logging.getLogger(__name__)


class ExportOrderResult:
    __slots__ = ("status", "moysklad_order_id", "error")

    def __init__(
        self,
        *,
        status: str,
        moysklad_order_id: str | None = None,
        error: str | None = None,
    ) -> None:
        self.status = status
        self.moysklad_order_id = moysklad_order_id
        self.error = error


class ExportOrderUseCase:
    def __init__(
        self,
        session: AsyncSession,
        client: IMoySkladOrderExportClient,
    ) -> None:
        self._session = session
        self._client = client
        self._orders = OrderExportRepository(session)
        self._sync = SyncStateRepository(session)

    async def execute(self, order_id: uuid.UUID) -> ExportOrderResult:
        payload = await self._orders.load_for_export(order_id)
        if payload is None:
            return ExportOrderResult(status="not_found")

        if payload.moysklad_order_id:
            return ExportOrderResult(
                status="already_exported",
                moysklad_order_id=payload.moysklad_order_id,
            )

        if not payload.lines:
            error = "No exportable line items (missing MoySklad variant/product IDs)"
            await self._log_failure(order_id, error)
            return ExportOrderResult(status="failed", error=error)

        if not payload.customer_email:
            error = "Order has no customer email for counterparty linking"
            await self._log_failure(order_id, error)
            return ExportOrderResult(status="failed", error=error)

        store_id = settings.moysklad_store_id
        if not store_id:
            error = "MOYSKLAD_STORE_ID is not configured"
            await self._log_failure(order_id, error)
            return ExportOrderResult(status="failed", error=error)

        try:
            organization_id = await self._client.get_default_organization_id()
            if not organization_id:
                raise RuntimeError("Could not resolve MoySklad organization")

            counterparty_id = await self._client.find_counterparty_by_email(payload.customer_email)
            if counterparty_id is None:
                counterparty_id = await self._client.create_counterparty(
                    email=payload.customer_email,
                    name=payload.customer_email.split("@", 1)[0] or payload.customer_email,
                )

            ms_order_id = await self._client.create_customer_order(
                order_number=payload.order_number,
                organization_id=organization_id,
                counterparty_id=counterparty_id,
                store_id=store_id,
                lines=payload.lines,
                description=f"Site order {payload.order_number}",
            )
        except Exception as exc:
            message = str(exc)
            logger.exception("moysklad_order_export_failed", extra={"order_id": str(order_id)})
            await self._log_failure(order_id, message)
            state = await self._sync.get_state()
            state.last_error = message
            return ExportOrderResult(status="failed", error=message)

        await self._orders.set_moysklad_order_id(order_id, ms_order_id)
        await self._sync.log_event(
            direction="outbound",
            entity_type="customerorder",
            entity_id=ms_order_id,
            status="success",
        )
        state = await self._sync.get_state()
        state.last_error = None
        return ExportOrderResult(status="success", moysklad_order_id=ms_order_id)

    async def _log_failure(self, order_id: uuid.UUID, message: str) -> None:
        await self._sync.log_event(
            direction="outbound",
            entity_type="customerorder",
            entity_id=str(order_id),
            status="error",
            error_message=message,
        )
        state = await self._sync.get_state()
        state.last_error = message


class OrderExportService:
    """Best-effort wrapper — never raises; safe for webhook path."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def try_export_order(self, order_id: uuid.UUID) -> None:
        client = build_moysklad_outbound_client()
        if client is None:
            return
        try:
            use_case = ExportOrderUseCase(self._session, client)
            await use_case.execute(order_id)
        except Exception:
            logger.exception("moysklad_order_export_unhandled", extra={"order_id": str(order_id)})
        finally:
            await client.close()


async def run_pending_order_exports(session: AsyncSession, *, limit: int = 20) -> int:
    client = build_moysklad_outbound_client()
    if client is None:
        return 0

    repo = OrderExportRepository(session)
    pending = await repo.list_pending_export_ids(limit=limit)
    if not pending:
        await client.close()
        return 0

    use_case = ExportOrderUseCase(session, client)
    exported = 0
    try:
        for order_id in pending:
            result = await use_case.execute(order_id)
            if result.status == "success":
                exported += 1
    finally:
        await client.close()
    return exported


async def export_order_by_id(session: AsyncSession, order_id: uuid.UUID) -> ExportOrderResult:
    client = build_moysklad_outbound_client()
    if client is None:
        return ExportOrderResult(status="disabled", error="Order export is not configured")
    try:
        return await ExportOrderUseCase(session, client).execute(order_id)
    finally:
        await client.close()
