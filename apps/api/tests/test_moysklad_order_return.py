"""Tests for MoySklad order return sync (MS → site cancellation)."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.features.integrations.moysklad.application.sync_order_return import (
    SyncMoySkladOrderReturnUseCase,
    _state_indicates_cancelled,
)


def test_state_indicates_cancelled_russian() -> None:
    assert _state_indicates_cancelled("Отменён") is True


def test_state_indicates_cancelled_english() -> None:
    assert _state_indicates_cancelled("Cancelled") is True


def test_state_indicates_cancelled_active() -> None:
    assert _state_indicates_cancelled("Новый") is False
    assert _state_indicates_cancelled(None) is False


@pytest.mark.asyncio
async def test_sync_customer_order_delete_cancels_local() -> None:
    session = AsyncMock()
    client = AsyncMock()
    inventory_service = MagicMock()
    inventory_service.restore_order_lines = AsyncMock()

    orders = AsyncMock()
    orders.get_order_number_by_moysklad_id = AsyncMock(return_value="ORD-1001")

    update_status = AsyncMock()
    update_status.execute = AsyncMock()

    use_case = SyncMoySkladOrderReturnUseCase(session, client, inventory_service)
    use_case._orders = orders
    use_case._update_status = update_status

    outcome = await use_case.sync_customer_order("ms-order-uuid", action="DELETE")

    assert outcome.handled is True
    assert outcome.local_order_number == "ORD-1001"
    update_status.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_sync_customer_order_skips_unknown_ms_id() -> None:
    session = AsyncMock()
    client = AsyncMock()
    inventory_service = MagicMock()

    orders = AsyncMock()
    orders.get_order_number_by_moysklad_id = AsyncMock(return_value=None)

    use_case = SyncMoySkladOrderReturnUseCase(session, client, inventory_service)
    use_case._orders = orders

    outcome = await use_case.sync_customer_order(str(uuid.uuid4()), action="UPDATE")

    assert outcome.handled is False
    client.get_customer_order.assert_not_called()


@pytest.mark.asyncio
async def test_sync_customer_order_update_with_cancelled_state() -> None:
    session = AsyncMock()
    client = AsyncMock()
    client.get_customer_order = AsyncMock(
        return_value={"id": "ms-order-uuid", "deleted": False, "state_name": "Отменён"}
    )
    inventory_service = MagicMock()

    orders = AsyncMock()
    orders.get_order_number_by_moysklad_id = AsyncMock(return_value="ORD-2002")

    update_status = AsyncMock()
    update_status.execute = AsyncMock()

    use_case = SyncMoySkladOrderReturnUseCase(session, client, inventory_service)
    use_case._orders = orders
    use_case._update_status = update_status

    outcome = await use_case.sync_customer_order("ms-order-uuid", action="UPDATE")

    assert outcome.handled is True
    update_status.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_sync_customer_order_update_active_state_skipped() -> None:
    session = AsyncMock()
    client = AsyncMock()
    client.get_customer_order = AsyncMock(
        return_value={"id": "ms-order-uuid", "deleted": False, "state_name": "Новый"}
    )
    inventory_service = MagicMock()

    orders = AsyncMock()
    orders.get_order_number_by_moysklad_id = AsyncMock(return_value="ORD-3003")

    update_status = AsyncMock()

    use_case = SyncMoySkladOrderReturnUseCase(session, client, inventory_service)
    use_case._orders = orders
    use_case._update_status = update_status

    outcome = await use_case.sync_customer_order("ms-order-uuid", action="UPDATE")

    assert outcome.handled is False
    update_status.execute.assert_not_called()
