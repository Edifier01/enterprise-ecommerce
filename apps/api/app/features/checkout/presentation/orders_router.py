"""Customer order history HTTP routes."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.features.auth.domain.entities import User
from app.features.auth.presentation.dependencies import get_current_user
from app.features.checkout.application.get_order import GetOrderUseCase
from app.features.checkout.application.list_orders import ListOrdersUseCase
from app.features.checkout.domain.ports import ICheckoutRepository
from app.features.checkout.presentation.dependencies import get_checkout_repository
from app.features.checkout.presentation.schemas import (
    OrderDetailSchema,
    OrderLineSchema,
    OrderListResponse,
    OrderSummarySchema,
)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=OrderListResponse, operation_id="listOrders")
async def list_orders(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> OrderListResponse:
    use_case = ListOrdersUseCase(repo)
    orders, total = await use_case.execute(
        customer_id=current_user.id,
        page=page,
        limit=limit,
    )
    return OrderListResponse(
        items=[
            OrderSummarySchema(
                id=order.id,
                order_number=order.order_number,
                status=order.status.value,
                currency=order.currency,
                total_cents=order.total_cents,
                created_at=order.created_at,
            )
            for order in orders
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{order_number}", response_model=OrderDetailSchema, operation_id="getOrder")
async def get_order(
    order_number: str,
    current_user: User = Depends(get_current_user),
    repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> OrderDetailSchema:
    use_case = GetOrderUseCase(repo)
    result = await use_case.execute(
        order_number=order_number,
        customer_id=current_user.id,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Order not found")

    order, lines = result
    return OrderDetailSchema(
        id=order.id,
        order_number=order.order_number,
        status=order.status.value,
        currency=order.currency,
        subtotal_cents=order.subtotal_cents,
        discount_cents=order.discount_cents,
        shipping_cents=order.shipping_cents,
        tax_cents=order.tax_cents,
        total_cents=order.total_cents,
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
    )
