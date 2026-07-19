"""Admin orders HTTP routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.features.admin.domain.entities import AdminUser
from app.features.admin.presentation.dependencies import require_permission
from app.features.checkout.application.get_admin_order import GetAdminOrderUseCase
from app.features.checkout.application.list_admin_orders import ListAdminOrdersUseCase
from app.features.checkout.application.update_admin_order_status import UpdateAdminOrderStatusUseCase
from app.features.checkout.domain.admin_ports import (
    IAdminOrdersRepository,
    InvalidOrderStatusTransitionError,
    OrderNotFoundError,
)
from app.features.checkout.domain.entities import OrderStatus
from app.features.checkout.infrastructure.persistence.admin_orders_repository import (
    AdminOrdersRepository,
)
from app.features.checkout.presentation.admin_schemas import (
    AdminOrderDetailSchema,
    AdminOrderListResponse,
    AdminOrderStatusHistorySchema,
    AdminOrderSummarySchema,
    AdminUpdateOrderStatusRequest,
)
from app.features.checkout.presentation.dependencies import get_inventory_service
from app.features.checkout.presentation.schemas import OrderLineSchema
from app.features.inventory.application.inventory_service import InventoryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/orders", tags=["admin"])


def get_admin_orders_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IAdminOrdersRepository:
    return AdminOrdersRepository(session)


def _detail_schema(
    order,
    lines,
    history,
    customer_email: str | None,
) -> AdminOrderDetailSchema:
    return AdminOrderDetailSchema(
        id=order.id,
        order_number=order.order_number,
        status=order.status.value,
        currency=order.currency,
        subtotal_cents=order.subtotal_cents,
        discount_cents=order.discount_cents,
        shipping_cents=order.shipping_cents,
        tax_cents=order.tax_cents,
        total_cents=order.total_cents,
        customer_email=customer_email,
        moysklad_order_id=order.moysklad_order_id,
        created_at=order.created_at,
        updated_at=order.updated_at,
        lines=[
            OrderLineSchema(
                id=line.id,
                variant_id=line.variant_id,
                quantity=line.quantity,
                unit_price_cents=line.unit_price_cents,
                line_total_cents=line.line_total_cents,
                product_snapshot=line.product_snapshot.to_dict(),
            )
            for line in lines
        ],
        status_history=[
            AdminOrderStatusHistorySchema(
                id=entry.id,
                from_status=entry.from_status,
                to_status=entry.to_status,
                changed_by=entry.changed_by,
                reason=entry.reason,
                changed_at=entry.changed_at,
            )
            for entry in history
        ],
    )


@router.get("", response_model=AdminOrderListResponse, operation_id="adminListOrders")
async def admin_list_orders(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: OrderStatus | None = Query(default=None),
    _admin: AdminUser = Depends(require_permission("admin:read")),
    repo: IAdminOrdersRepository = Depends(get_admin_orders_repository),
) -> AdminOrderListResponse:
    use_case = ListAdminOrdersUseCase(repo)
    items, total = await use_case.execute(page=page, limit=limit, status=status)
    return AdminOrderListResponse(
        items=[
            AdminOrderSummarySchema(
                id=row.id,
                order_number=row.order_number,
                status=row.status.value,
                currency=row.currency,
                total_cents=row.total_cents,
                customer_email=row.customer_email,
                moysklad_order_id=row.moysklad_order_id,
                created_at=row.created_at,
            )
            for row in items
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.get(
    "/{order_number}",
    response_model=AdminOrderDetailSchema,
    operation_id="adminGetOrder",
)
async def admin_get_order(
    order_number: str,
    _admin: AdminUser = Depends(require_permission("admin:read")),
    repo: IAdminOrdersRepository = Depends(get_admin_orders_repository),
) -> AdminOrderDetailSchema:
    use_case = GetAdminOrderUseCase(repo)
    result = await use_case.execute(order_number)
    if result is None:
        raise HTTPException(status_code=404, detail="Order not found")

    order, lines, history, customer_email = result
    return _detail_schema(order, lines, history, customer_email)


@router.patch(
    "/{order_number}/status",
    response_model=AdminOrderDetailSchema,
    operation_id="adminUpdateOrderStatus",
)
async def admin_update_order_status(
    order_number: str,
    request: AdminUpdateOrderStatusRequest,
    admin: AdminUser = Depends(require_permission("orders:write")),
    repo: IAdminOrdersRepository = Depends(get_admin_orders_repository),
    inventory_service: InventoryService = Depends(get_inventory_service),
    session: AsyncSession = Depends(get_db_session),
) -> AdminOrderDetailSchema:
    new_status = OrderStatus(request.status.value)
    use_case = UpdateAdminOrderStatusUseCase(repo, inventory_service)

    try:
        order, lines, history, customer_email = await use_case.execute(
            order_number=order_number,
            new_status=new_status,
            changed_by=admin.email,
            reason=request.reason,
        )
    except OrderNotFoundError:
        raise HTTPException(status_code=404, detail="Order not found")
    except InvalidOrderStatusTransitionError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status transition from {exc.from_status.value} to {exc.to_status.value}",
        )

    logger.info(
        "admin_order_status_updated",
        extra={
            "admin_id": str(admin.id),
            "order_number": order_number,
            "new_status": new_status.value,
            "reason": request.reason,
        },
    )
    await session.commit()
    return _detail_schema(order, lines, history, customer_email)
