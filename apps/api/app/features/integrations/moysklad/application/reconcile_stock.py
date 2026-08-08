"""Reconcile ERP awaiting fulfillment against MoySklad order state."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.catalog.infrastructure.inventory_ports_adapter import StorefrontAvailabilityAdapter
from app.features.checkout.domain.entities import OrderStatus
from app.features.checkout.infrastructure.persistence.models import OrderLineModel, OrderModel
from app.features.integrations.moysklad.domain.ports import IMoySkladClient
from app.features.inventory.application.inventory_service import InventoryService
from app.features.inventory.infrastructure.persistence.repository import InventoryRepository

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ReconcileStockResult:
    orders_checked: int = 0
    orders_settled: int = 0
    variants_swept: int = 0
    errors: list[str] = field(default_factory=list)


def _ms_order_is_fulfilled(
    ms_row: dict[str, str | bool | None] | None,
    *,
    local_status: str,
) -> bool:
    """Conservative per-order settle until per-position shipped qty exists (ADR-015).

    Local admin SHIPPED must NOT clear awaiting (local shipped ≠ ERP fulfillment).
    State-name heuristics are also unused (partial shipment risk).
    Primary awaiting clearance is apply_stock when MS physical stock drops.
    """
    del local_status  # intentionally unused — see docstring
    return ms_row is not None and bool(ms_row.get("deleted"))


class ReconcileErpStockUseCase:
    """Settle awaiting when MS order is deleted; sweep expected awaiting from open exports."""

    def __init__(
        self,
        session: AsyncSession,
        client: IMoySkladClient,
        inventory_service: InventoryService,
    ) -> None:
        self._session = session
        self._client = client
        self._inventory = inventory_service
        self._inventory_repo = InventoryRepository(session)
        self._storefront = StorefrontAvailabilityAdapter(session)

    async def execute(self, *, limit: int = 50) -> ReconcileStockResult:
        result = ReconcileStockResult()
        await self._reconcile_orders(limit=limit, result=result)
        await self._convergence_sweep(result=result)
        return result

    async def _reconcile_orders(self, *, limit: int, result: ReconcileStockResult) -> None:
        stmt = (
            select(OrderModel)
            .where(
                OrderModel.moysklad_order_id.is_not(None),
                OrderModel.erp_fulfilled_at.is_(None),
            )
            .options(selectinload(OrderModel.lines))
            .order_by(OrderModel.created_at.asc())
            .limit(limit)
        )
        orders = list((await self._session.scalars(stmt)).all())
        result.orders_checked = len(orders)

        for order in orders:
            ms_order_id = order.moysklad_order_id
            if ms_order_id is None:
                continue
            try:
                ms_row = await self._client.get_customer_order(ms_order_id)
                if not _ms_order_is_fulfilled(ms_row, local_status=order.status):
                    continue

                line_quantities = [(line.variant_id, line.quantity) for line in order.lines]
                await self._inventory.settle_shipped_order_lines(line_quantities)
                order.erp_fulfilled_at = datetime.now(UTC)
                await self._session.flush()
                result.orders_settled += 1
            except Exception as exc:
                message = f"order {order.order_number}: {exc}"
                logger.exception("erp_stock_reconcile_order_failed")
                result.errors.append(message)

    async def _convergence_sweep(self, *, result: ReconcileStockResult) -> None:
        expected_stmt = (
            select(
                OrderLineModel.variant_id,
                func.coalesce(func.sum(OrderLineModel.quantity), 0).label("expected_awaiting"),
            )
            .join(OrderModel, OrderLineModel.order_id == OrderModel.id)
            .where(
                OrderModel.moysklad_order_id.is_not(None),
                OrderModel.erp_fulfilled_at.is_(None),
                # ADR-015 §5b: all unfulfilled exports — including locally SHIPPED
                # (local ship ≠ ERP fulfillment). Exclude canceled (awaiting already
                # settled via restore_order_lines).
                OrderModel.status.in_(
                    (OrderStatus.CONFIRMED.value, OrderStatus.SHIPPED.value)
                ),
            )
            .group_by(OrderLineModel.variant_id)
        )
        expected_rows = (await self._session.execute(expected_stmt)).all()
        expected_by_variant: dict[UUID, int] = {
            row.variant_id: int(row.expected_awaiting) for row in expected_rows
        }

        touched_variant_ids = set(expected_by_variant.keys())
        if not touched_variant_ids:
            return

        items = await self._inventory_repo.lock_items_by_variant_ids(list(touched_variant_ids))
        for variant_id in sorted(touched_variant_ids, key=str):
            expected = expected_by_variant.get(variant_id, 0)
            item = items.get(variant_id)
            if item is None:
                if expected > 0:
                    result.errors.append(
                        f"variant {variant_id}: missing inventory row with expected awaiting {expected}"
                    )
                continue
            current = item.quantity_awaiting_fulfillment
            if current == expected:
                continue
            await self._inventory_repo.set_awaiting(variant_id, expected)
            available = max(
                0,
                item.quantity_on_hand - item.quantity_reserved - expected,
            )
            await self._storefront.apply_availability(variant_id, available)
            result.variants_swept += 1


async def run_erp_stock_reconciliation(session: AsyncSession, *, limit: int = 50) -> ReconcileStockResult:
    from app.features.integrations.moysklad.infrastructure.http_client import build_moysklad_client
    from app.features.inventory.application.sweep_expired_reservations import build_inventory_service

    client = build_moysklad_client()
    if client is None:
        raise RuntimeError("MOYSKLAD_API_TOKEN is not configured")

    use_case = ReconcileErpStockUseCase(
        session,
        client,
        build_inventory_service(session),
    )
    try:
        return await use_case.execute(limit=limit)
    finally:
        await client.close()
