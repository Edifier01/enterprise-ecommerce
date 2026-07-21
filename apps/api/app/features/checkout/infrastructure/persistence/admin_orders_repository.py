"""Admin orders repository — list, detail, and status transitions."""

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.auth.infrastructure.persistence.models import UserModel, WholesalerProfileModel
from app.features.checkout.domain.admin_ports import (
    ALLOWED_ORDER_STATUS_TRANSITIONS,
    AdminOrderCustomerInfo,
    AdminOrderListRow,
    AdminOrderStatusHistoryEntry,
    IAdminOrdersRepository,
    InvalidOrderStatusTransitionError,
    OrderNotFoundError,
)
from app.features.checkout.domain.entities import Order, OrderLine, OrderStatus
from app.features.checkout.infrastructure.persistence.models import OrderModel, OrderStatusHistoryModel
from app.features.checkout.infrastructure.persistence.repository import (
    _order_from_model,
    _order_line_from_model,
)


def _history_from_model(model: OrderStatusHistoryModel) -> AdminOrderStatusHistoryEntry:
    return AdminOrderStatusHistoryEntry(
        id=model.id,
        from_status=model.from_status,
        to_status=model.to_status,
        changed_by=model.changed_by,
        reason=model.reason,
        changed_at=model.changed_at,
    )


def _customer_info_from_row(
    order: OrderModel,
    user: UserModel | None,
    profile: WholesalerProfileModel | None,
) -> AdminOrderCustomerInfo:
    email = (user.email if user else None) or order.guest_email
    name: str | None = order.shipping_recipient_name
    if profile is not None and not name:
        name = profile.full_name
    elif user is not None and not name:
        parts = [user.first_name or "", user.last_name or ""]
        joined = " ".join(part for part in parts if part).strip()
        name = joined or None

    phone = order.shipping_phone or (profile.phone if profile is not None else None)
    shipping_address = order.shipping_address or (
        profile.legal_address if profile is not None else None
    )

    return AdminOrderCustomerInfo(
        email=email,
        name=name,
        phone=phone,
        shipping_address=shipping_address,
        is_wholesaler=bool(user and user.is_wholesaler),
    )


class AdminOrdersRepository(IAdminOrdersRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_orders(
        self,
        *,
        page: int,
        limit: int,
        status: OrderStatus | None,
        export_pending: bool = False,
        q: str | None = None,
    ) -> tuple[list[AdminOrderListRow], int]:
        offset = (page - 1) * limit
        filters = []
        if export_pending:
            filters.append(OrderModel.status == OrderStatus.CONFIRMED.value)
            filters.append(OrderModel.moysklad_order_id.is_(None))
        elif status is not None:
            filters.append(OrderModel.status == status.value)

        if q is not None and q.strip():
            term = f"%{q.strip()}%"
            filters.append(
                or_(
                    OrderModel.order_number.ilike(term),
                    UserModel.email.ilike(term),
                    OrderModel.guest_email.ilike(term),
                )
            )

        count_stmt = (
            select(func.count())
            .select_from(OrderModel)
            .outerjoin(UserModel, OrderModel.customer_id == UserModel.id)
        )
        stmt = (
            select(OrderModel, UserModel.email)
            .outerjoin(UserModel, OrderModel.customer_id == UserModel.id)
            .order_by(OrderModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        if filters:
            count_stmt = count_stmt.where(*filters)
            stmt = stmt.where(*filters)

        total = int((await self._session.scalar(count_stmt)) or 0)
        rows = (await self._session.execute(stmt)).all()
        items = [
            AdminOrderListRow(
                id=order.id,
                order_number=order.order_number,
                status=OrderStatus(order.status),
                currency=order.currency,
                total_cents=order.total_cents,
                customer_email=customer_email or order.guest_email,
                moysklad_order_id=order.moysklad_order_id,
                created_at=order.created_at,
            )
            for order, customer_email in rows
        ]
        return items, total

    async def get_order_detail(
        self,
        order_number: str,
    ) -> tuple[Order, list[OrderLine], list[AdminOrderStatusHistoryEntry], AdminOrderCustomerInfo] | None:
        result = await self._session.execute(
            select(OrderModel, UserModel, WholesalerProfileModel)
            .outerjoin(UserModel, OrderModel.customer_id == UserModel.id)
            .outerjoin(WholesalerProfileModel, WholesalerProfileModel.user_id == UserModel.id)
            .where(OrderModel.order_number == order_number)
            .options(
                selectinload(OrderModel.lines),
                selectinload(OrderModel.status_history),
            )
        )
        row = result.one_or_none()
        if row is None:
            return None

        model, user, profile = row
        history = sorted(model.status_history, key=lambda entry: entry.changed_at)
        customer = _customer_info_from_row(model, user, profile)
        return (
            _order_from_model(model),
            [_order_line_from_model(line) for line in model.lines],
            [_history_from_model(entry) for entry in history],
            customer,
        )

    async def update_order_status(
        self,
        *,
        order_number: str,
        new_status: OrderStatus,
        changed_by: str,
        reason: str | None,
    ) -> tuple[Order, list[OrderLine], list[AdminOrderStatusHistoryEntry], str | None]:
        result = await self._session.execute(
            select(OrderModel)
            .where(OrderModel.order_number == order_number)
            .options(selectinload(OrderModel.lines))
            .with_for_update()
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise OrderNotFoundError(order_number)

        current_status = OrderStatus(model.status)
        allowed = ALLOWED_ORDER_STATUS_TRANSITIONS.get(current_status, frozenset())
        if new_status not in allowed:
            raise InvalidOrderStatusTransitionError(current_status, new_status)

        model.status = new_status.value
        self._session.add(
            OrderStatusHistoryModel(
                order_id=model.id,
                from_status=current_status.value,
                to_status=new_status.value,
                changed_by=changed_by,
                reason=reason,
            )
        )
        await self._session.flush()

        detail = await self.get_order_detail(order_number)
        assert detail is not None
        return detail
