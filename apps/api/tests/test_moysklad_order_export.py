"""Tests for MoySklad order export."""

import uuid
from unittest.mock import AsyncMock

import pytest

from app.features.integrations.moysklad.application.export_order import ExportOrderUseCase
from app.features.integrations.moysklad.domain.order_export_ports import OrderExportLine


class _FakeExportClient:
    def __init__(self) -> None:
        self.created_orders: list[str] = []

    async def find_counterparty_by_email(self, email: str) -> str | None:
        return "counterparty-uuid"

    async def create_counterparty(self, *, email: str, name: str) -> str:
        return "new-counterparty-uuid"

    async def create_customer_order(self, **kwargs) -> str:
        self.created_orders.append(kwargs["order_number"])
        return "ms-order-uuid"

    async def get_default_organization_id(self) -> str | None:
        return "org-uuid"


class _FakeOrderRepo:
    def __init__(self, payload) -> None:
        self._payload = payload
        self.saved_ms_id: str | None = None

    async def load_for_export(self, order_id: uuid.UUID):
        return self._payload

    async def set_moysklad_order_id(self, order_id: uuid.UUID, moysklad_order_id: str) -> None:
        self.saved_ms_id = moysklad_order_id


class _FakeSyncRepo:
    def __init__(self) -> None:
        self.events: list[dict] = []
        self.state = type("State", (), {"last_error": None})()

    async def get_state(self):
        return self.state

    async def log_event(self, **kwargs) -> None:
        self.events.append(kwargs)


@pytest.mark.asyncio
async def test_export_order_skips_when_already_exported() -> None:
    from app.features.integrations.moysklad.domain.order_export_ports import OrderExportPayload

    order_id = uuid.uuid4()
    payload = OrderExportPayload(
        order_id=order_id,
        order_number="ORD-TEST",
        customer_email="buyer@example.com",
        currency="RUB",
        moysklad_order_id="existing-ms-id",
        lines=(
            OrderExportLine(
                quantity=1,
                unit_price_cents=1000,
                moysklad_assortment_id="variant-uuid",
                assortment_type="variant",
            ),
        ),
    )

    session = AsyncMock()
    use_case = ExportOrderUseCase(session, _FakeExportClient())
    use_case._orders = _FakeOrderRepo(payload)
    use_case._sync = _FakeSyncRepo()

    result = await use_case.execute(order_id)
    assert result.status == "already_exported"
    assert result.moysklad_order_id == "existing-ms-id"


@pytest.mark.asyncio
async def test_export_order_success() -> None:
    from app.features.integrations.moysklad.domain.order_export_ports import OrderExportPayload

    order_id = uuid.uuid4()
    payload = OrderExportPayload(
        order_id=order_id,
        order_number="ORD-NEW",
        customer_email="buyer@example.com",
        currency="RUB",
        moysklad_order_id=None,
        lines=(
            OrderExportLine(
                quantity=2,
                unit_price_cents=1500,
                moysklad_assortment_id="variant-uuid",
                assortment_type="variant",
            ),
        ),
    )

    client = _FakeExportClient()
    session = AsyncMock()
    use_case = ExportOrderUseCase(session, client)
    orders = _FakeOrderRepo(payload)
    use_case._orders = orders
    use_case._sync = _FakeSyncRepo()

    with pytest.MonkeyPatch.context() as mp:
        from app.core import config

        mp.setattr(config.settings, "moysklad_store_id", "store-uuid")

        result = await use_case.execute(order_id)

    assert result.status == "success"
    assert result.moysklad_order_id == "ms-order-uuid"
    assert orders.saved_ms_id == "ms-order-uuid"
    assert client.created_orders == ["ORD-NEW"]
