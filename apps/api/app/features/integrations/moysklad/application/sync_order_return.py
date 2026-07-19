"""Sync MoySklad customer order status back to site (returns/cancellations)."""

import logging
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.checkout.application.update_admin_order_status import UpdateAdminOrderStatusUseCase
from app.features.checkout.domain.admin_ports import (
    InvalidOrderStatusTransitionError,
    OrderNotFoundError,
)
from app.features.checkout.domain.entities import OrderStatus
from app.features.checkout.infrastructure.persistence.admin_orders_repository import (
    AdminOrdersRepository,
)
from app.features.integrations.moysklad.domain.ports import IMoySkladClient
from app.features.integrations.moysklad.infrastructure.persistence.order_export_repository import (
    OrderExportRepository,
)
from app.features.inventory.application.inventory_service import InventoryService

logger = logging.getLogger(__name__)

_CANCELLED_STATE_HINTS = ("отмен", "cancel", "annul", "revoked")


@dataclass(frozen=True, slots=True)
class OrderReturnSyncOutcome:
    handled: bool
    action: str
    entity_id: str
    local_order_number: str | None = None


def _state_indicates_cancelled(state_name: str | None) -> bool:
    if not state_name:
        return False
    lowered = state_name.casefold()
    return any(hint in lowered for hint in _CANCELLED_STATE_HINTS)


class SyncMoySkladOrderReturnUseCase:
    """Apply MoySklad customer order cancellation to local order (MS → site)."""

    def __init__(
        self,
        session: AsyncSession,
        client: IMoySkladClient,
        inventory_service: InventoryService,
    ) -> None:
        self._session = session
        self._client = client
        self._orders = OrderExportRepository(session)
        self._admin_orders = AdminOrdersRepository(session)
        self._update_status = UpdateAdminOrderStatusUseCase(self._admin_orders, inventory_service)

    async def sync_customer_order(self, ms_order_id: str, *, action: str) -> OrderReturnSyncOutcome:
        local_order_number = await self._orders.get_order_number_by_moysklad_id(ms_order_id)
        if local_order_number is None:
            return OrderReturnSyncOutcome(False, action, ms_order_id)

        should_cancel = action == "DELETE" or await self._fetch_cancelled_from_ms(ms_order_id)
        if not should_cancel:
            return OrderReturnSyncOutcome(False, action, ms_order_id, local_order_number)

        try:
            await self._update_status.execute(
                order_number=local_order_number,
                new_status=OrderStatus.CANCELED,
                changed_by="moysklad",
                reason="Cancelled or returned in MoySklad",
            )
        except InvalidOrderStatusTransitionError:
            logger.info(
                "moysklad_order_return_skip_transition",
                extra={"order_number": local_order_number, "ms_order_id": ms_order_id},
            )
            return OrderReturnSyncOutcome(False, action, ms_order_id, local_order_number)
        except OrderNotFoundError:
            return OrderReturnSyncOutcome(False, action, ms_order_id)

        return OrderReturnSyncOutcome(True, action, ms_order_id, local_order_number)

    async def _fetch_cancelled_from_ms(self, ms_order_id: str) -> bool:
        row = await self._client.get_customer_order(ms_order_id)
        if row is None:
            return False
        if bool(row.get("deleted")):
            return True
        state_name = row.get("state_name")
        return _state_indicates_cancelled(state_name if isinstance(state_name, str) else None)


async def run_order_return_sync(
    session: AsyncSession,
    *,
    ms_order_id: str,
    action: str,
    inventory_service: InventoryService,
) -> OrderReturnSyncOutcome:
    from app.features.integrations.moysklad.infrastructure.http_client import build_moysklad_client

    client = build_moysklad_client()
    if client is None:
        raise RuntimeError("MOYSKLAD_API_TOKEN is not configured")

    use_case = SyncMoySkladOrderReturnUseCase(session, client, inventory_service)
    try:
        return await use_case.sync_customer_order(ms_order_id, action=action)
    finally:
        await client.close()
