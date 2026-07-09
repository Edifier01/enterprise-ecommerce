"""Checkout SQLAlchemy repository."""

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.checkout.domain.entities import (
    Cart,
    CartLine,
    CartStatus,
    CheckoutSession,
    CheckoutSessionLine,
    CheckoutSessionStatus,
    Order,
    OrderStatus,
    PaymentRecord,
    PaymentRecordStatus,
    ProductSnapshot,
)
from app.features.checkout.domain.ports import ICheckoutRepository
from app.features.checkout.infrastructure.persistence.models import (
    CartLineModel,
    CartModel,
    CheckoutSessionLineModel,
    CheckoutSessionModel,
    OrderLineModel,
    OrderModel,
    OrderStatusHistoryModel,
    PaymentRecordModel,
    StripeWebhookEventModel,
)


def _line_from_model(model: CartLineModel) -> CartLine:
    return CartLine(
        id=model.id,
        cart_id=model.cart_id,
        variant_id=model.variant_id,
        quantity=model.quantity,
        unit_price_cents=model.unit_price_cents,
        currency=model.currency,
        product_snapshot=ProductSnapshot.from_dict(model.product_snapshot),
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _cart_from_model(model: CartModel) -> Cart:
    return Cart(
        id=model.id,
        session_token=model.session_token,
        user_id=model.user_id,
        status=CartStatus(model.status),
        lines=[_line_from_model(line) for line in model.lines],
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _session_line_from_model(model: CheckoutSessionLineModel) -> CheckoutSessionLine:
    return CheckoutSessionLine(
        id=model.id,
        checkout_session_id=model.checkout_session_id,
        variant_id=model.variant_id,
        quantity=model.quantity,
        unit_price_cents=model.unit_price_cents,
        currency=model.currency,
        product_snapshot=ProductSnapshot.from_dict(model.product_snapshot),
    )


def _session_from_model(model: CheckoutSessionModel) -> CheckoutSession:
    return CheckoutSession(
        id=model.id,
        cart_id=model.cart_id,
        user_id=model.user_id,
        status=CheckoutSessionStatus(model.status),
        currency=model.currency,
        subtotal_cents=model.subtotal_cents,
        total_cents=model.total_cents,
        idempotency_key=model.idempotency_key,
        stripe_payment_intent_id=model.stripe_payment_intent_id,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _payment_from_model(model: PaymentRecordModel) -> PaymentRecord:
    return PaymentRecord(
        id=model.id,
        checkout_session_id=model.checkout_session_id,
        order_id=model.order_id,
        stripe_payment_intent_id=model.stripe_payment_intent_id,
        stripe_charge_id=model.stripe_charge_id,
        amount_cents=model.amount_cents,
        currency=model.currency,
        status=PaymentRecordStatus(model.status),
        idempotency_key=model.idempotency_key,
        failure_code=model.failure_code,
        failure_message=model.failure_message,
        payment_method_summary=model.payment_method_summary,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _order_from_model(model: OrderModel) -> Order:
    return Order(
        id=model.id,
        order_number=model.order_number,
        checkout_session_id=model.checkout_session_id,
        customer_id=model.customer_id,
        guest_email=model.guest_email,
        status=OrderStatus(model.status),
        currency=model.currency,
        subtotal_cents=model.subtotal_cents,
        discount_cents=model.discount_cents,
        shipping_cents=model.shipping_cents,
        tax_cents=model.tax_cents,
        total_cents=model.total_cents,
        payment_record_id=model.payment_record_id,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _generate_order_number() -> str:
    now = datetime.now(timezone.utc)
    suffix = secrets.token_hex(3).upper()
    return f"ORD-{now.strftime('%Y%m%d')}-{suffix}"


class CheckoutRepository(ICheckoutRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_variant_with_product(self, variant_id: uuid.UUID) -> tuple | None:
        stmt = (
            select(ProductVariantModel, ProductModel)
            .join(ProductModel, ProductVariantModel.product_id == ProductModel.id)
            .where(ProductVariantModel.id == variant_id)
        )
        result = await self._session.execute(stmt)
        row = result.first()
        return (row[0], row[1]) if row else None

    async def _load_cart(self, stmt) -> Cart | None:
        stmt = stmt.options(selectinload(CartModel.lines))
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return _cart_from_model(model) if model else None

    async def get_active_cart_by_session_token(self, session_token: str) -> Cart | None:
        stmt = select(CartModel).where(
            CartModel.session_token == session_token,
            CartModel.status == CartStatus.ACTIVE.value,
        )
        return await self._load_cart(stmt)

    async def get_active_cart_by_user_id(self, user_id: uuid.UUID) -> Cart | None:
        stmt = select(CartModel).where(
            CartModel.user_id == user_id,
            CartModel.status == CartStatus.ACTIVE.value,
        )
        return await self._load_cart(stmt)

    async def create_cart(self, session_token: str | None, user_id: uuid.UUID | None) -> Cart:
        model = CartModel(session_token=session_token, user_id=user_id, status=CartStatus.ACTIVE.value)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model, attribute_names=["lines"])
        return _cart_from_model(model)

    async def get_cart_by_id(self, cart_id: uuid.UUID) -> Cart | None:
        stmt = select(CartModel).where(CartModel.id == cart_id)
        return await self._load_cart(stmt)

    async def get_cart_line(self, line_id: uuid.UUID) -> CartLine | None:
        result = await self._session.execute(select(CartLineModel).where(CartLineModel.id == line_id))
        model = result.scalar_one_or_none()
        return _line_from_model(model) if model else None

    async def upsert_cart_line(
        self,
        cart_id: uuid.UUID,
        variant_id: uuid.UUID,
        quantity: int,
        unit_price_cents: int,
        currency: str,
        snapshot: ProductSnapshot,
    ) -> CartLine:
        result = await self._session.execute(
            select(CartLineModel).where(
                CartLineModel.cart_id == cart_id,
                CartLineModel.variant_id == variant_id,
            )
        )
        model = result.scalar_one_or_none()
        if model:
            model.quantity = quantity
            model.unit_price_cents = unit_price_cents
            model.currency = currency
            model.product_snapshot = snapshot.to_dict()
        else:
            model = CartLineModel(
                cart_id=cart_id,
                variant_id=variant_id,
                quantity=quantity,
                unit_price_cents=unit_price_cents,
                currency=currency,
                product_snapshot=snapshot.to_dict(),
            )
            self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _line_from_model(model)

    async def update_cart_line_quantity(self, line_id: uuid.UUID, quantity: int) -> CartLine | None:
        result = await self._session.execute(select(CartLineModel).where(CartLineModel.id == line_id))
        model = result.scalar_one_or_none()
        if model is None:
            return None
        model.quantity = quantity
        await self._session.flush()
        await self._session.refresh(model)
        return _line_from_model(model)

    async def delete_cart_line(self, line_id: uuid.UUID) -> bool:
        result = await self._session.execute(select(CartLineModel).where(CartLineModel.id == line_id))
        model = result.scalar_one_or_none()
        if model is None:
            return False
        await self._session.delete(model)
        await self._session.flush()
        return True

    async def mark_cart_converted(self, cart_id: uuid.UUID) -> None:
        result = await self._session.execute(select(CartModel).where(CartModel.id == cart_id))
        model = result.scalar_one_or_none()
        if model:
            model.status = CartStatus.CONVERTED.value
            await self._session.flush()

    async def get_checkout_session_by_id(self, session_id: uuid.UUID) -> CheckoutSession | None:
        result = await self._session.execute(
            select(CheckoutSessionModel).where(CheckoutSessionModel.id == session_id)
        )
        model = result.scalar_one_or_none()
        return _session_from_model(model) if model else None

    async def get_checkout_session_by_idempotency_key(
        self, idempotency_key: str
    ) -> CheckoutSession | None:
        result = await self._session.execute(
            select(CheckoutSessionModel).where(
                CheckoutSessionModel.idempotency_key == idempotency_key
            )
        )
        model = result.scalar_one_or_none()
        return _session_from_model(model) if model else None

    async def create_checkout_session(
        self,
        cart_id: uuid.UUID,
        user_id: uuid.UUID | None,
        currency: str,
        subtotal_cents: int,
        total_cents: int,
        idempotency_key: str | None,
    ) -> CheckoutSession:
        model = CheckoutSessionModel(
            cart_id=cart_id,
            user_id=user_id,
            status=CheckoutSessionStatus.OPEN.value,
            currency=currency,
            subtotal_cents=subtotal_cents,
            total_cents=total_cents,
            idempotency_key=idempotency_key,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _session_from_model(model)

    async def create_checkout_session_lines(
        self,
        checkout_session_id: uuid.UUID,
        lines: list[tuple[uuid.UUID, int, int, str, ProductSnapshot]],
    ) -> list[CheckoutSessionLine]:
        created: list[CheckoutSessionLine] = []
        for variant_id, quantity, unit_price_cents, currency, snapshot in lines:
            model = CheckoutSessionLineModel(
                checkout_session_id=checkout_session_id,
                variant_id=variant_id,
                quantity=quantity,
                unit_price_cents=unit_price_cents,
                currency=currency,
                product_snapshot=snapshot.to_dict(),
            )
            self._session.add(model)
            await self._session.flush()
            await self._session.refresh(model)
            created.append(_session_line_from_model(model))
        return created

    async def get_checkout_session_lines(
        self, checkout_session_id: uuid.UUID
    ) -> list[CheckoutSessionLine]:
        result = await self._session.execute(
            select(CheckoutSessionLineModel)
            .where(CheckoutSessionLineModel.checkout_session_id == checkout_session_id)
            .order_by(CheckoutSessionLineModel.created_at)
        )
        models = result.scalars().all()
        return [_session_line_from_model(model) for model in models]

    async def update_checkout_session_status(
        self, session_id: uuid.UUID, status: str, stripe_payment_intent_id: str | None = None
    ) -> None:
        result = await self._session.execute(
            select(CheckoutSessionModel).where(CheckoutSessionModel.id == session_id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.status = status
            if stripe_payment_intent_id is not None:
                model.stripe_payment_intent_id = stripe_payment_intent_id
            await self._session.flush()

    async def get_payment_record_by_idempotency_key(
        self, idempotency_key: str
    ) -> PaymentRecord | None:
        result = await self._session.execute(
            select(PaymentRecordModel).where(PaymentRecordModel.idempotency_key == idempotency_key)
        )
        model = result.scalar_one_or_none()
        return _payment_from_model(model) if model else None

    async def get_payment_record_by_stripe_pi_id(
        self, stripe_payment_intent_id: str
    ) -> PaymentRecord | None:
        result = await self._session.execute(
            select(PaymentRecordModel).where(
                PaymentRecordModel.stripe_payment_intent_id == stripe_payment_intent_id
            )
        )
        model = result.scalar_one_or_none()
        return _payment_from_model(model) if model else None

    async def get_payment_record_by_checkout_session(
        self, checkout_session_id: uuid.UUID
    ) -> PaymentRecord | None:
        result = await self._session.execute(
            select(PaymentRecordModel).where(
                PaymentRecordModel.checkout_session_id == checkout_session_id
            )
        )
        model = result.scalar_one_or_none()
        return _payment_from_model(model) if model else None

    async def create_payment_record(
        self,
        checkout_session_id: uuid.UUID,
        stripe_payment_intent_id: str,
        amount_cents: int,
        currency: str,
        idempotency_key: str,
    ) -> PaymentRecord:
        model = PaymentRecordModel(
            checkout_session_id=checkout_session_id,
            stripe_payment_intent_id=stripe_payment_intent_id,
            amount_cents=amount_cents,
            currency=currency,
            status=PaymentRecordStatus.PENDING.value,
            idempotency_key=idempotency_key,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _payment_from_model(model)

    async def update_payment_record(
        self,
        payment_record_id: uuid.UUID,
        status: str,
        stripe_charge_id: str | None = None,
        failure_code: str | None = None,
        failure_message: str | None = None,
        payment_method_summary: dict | None = None,
        order_id: uuid.UUID | None = None,
    ) -> None:
        result = await self._session.execute(
            select(PaymentRecordModel).where(PaymentRecordModel.id == payment_record_id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.status = status
            if stripe_charge_id is not None:
                model.stripe_charge_id = stripe_charge_id
            if failure_code is not None:
                model.failure_code = failure_code
            if failure_message is not None:
                model.failure_message = failure_message
            if payment_method_summary is not None:
                model.payment_method_summary = payment_method_summary
            if order_id is not None:
                model.order_id = order_id
            await self._session.flush()

    async def is_webhook_event_processed(self, stripe_event_id: str) -> bool:
        result = await self._session.execute(
            select(StripeWebhookEventModel.id).where(
                StripeWebhookEventModel.stripe_event_id == stripe_event_id
            )
        )
        return result.scalar_one_or_none() is not None

    async def mark_webhook_event_processed(self, stripe_event_id: str, event_type: str) -> None:
        self._session.add(
            StripeWebhookEventModel(stripe_event_id=stripe_event_id, event_type=event_type)
        )
        await self._session.flush()

    async def get_order_by_checkout_session(self, checkout_session_id: uuid.UUID) -> Order | None:
        result = await self._session.execute(
            select(OrderModel).where(OrderModel.checkout_session_id == checkout_session_id)
        )
        model = result.scalar_one_or_none()
        return _order_from_model(model) if model else None

    async def create_order(
        self,
        order_number: str,
        checkout_session_id: uuid.UUID,
        customer_id: uuid.UUID | None,
        guest_email: str | None,
        currency: str,
        subtotal_cents: int,
        total_cents: int,
        payment_record_id: uuid.UUID,
        lines: list[tuple[uuid.UUID, int, int, int, ProductSnapshot]],
    ) -> Order:
        order = OrderModel(
            order_number=order_number,
            checkout_session_id=checkout_session_id,
            customer_id=customer_id,
            guest_email=guest_email,
            status=OrderStatus.CONFIRMED.value,
            currency=currency,
            subtotal_cents=subtotal_cents,
            total_cents=total_cents,
            payment_record_id=payment_record_id,
        )
        self._session.add(order)
        await self._session.flush()

        for variant_id, quantity, unit_price_cents, line_total_cents, snapshot in lines:
            self._session.add(
                OrderLineModel(
                    order_id=order.id,
                    variant_id=variant_id,
                    quantity=quantity,
                    unit_price_cents=unit_price_cents,
                    line_total_cents=line_total_cents,
                    product_snapshot=snapshot.to_dict(),
                )
            )

        self._session.add(
            OrderStatusHistoryModel(
                order_id=order.id,
                from_status=None,
                to_status=OrderStatus.CONFIRMED.value,
                changed_by="system",
                reason="Payment confirmed via Stripe webhook",
            )
        )
        await self._session.flush()
        await self._session.refresh(order)
        return _order_from_model(order)

    async def merge_guest_cart_into_user_cart(
        self, guest_session_token: str, user_id: uuid.UUID
    ) -> Cart:
        """Merge guest cart lines into the user's active cart (merge-on-login capability)."""
        guest_cart = await self.get_active_cart_by_session_token(guest_session_token)
        if guest_cart is None or guest_cart.is_empty:
            user_cart = await self.get_active_cart_by_user_id(user_id)
            if user_cart is None:
                return await self.create_cart(session_token=None, user_id=user_id)
            return user_cart

        user_cart = await self.get_active_cart_by_user_id(user_id)
        if user_cart is None:
            result = await self._session.execute(
                select(CartModel).where(CartModel.session_token == guest_session_token)
            )
            model = result.scalar_one_or_none()
            if model:
                model.user_id = user_id
                model.session_token = None
                await self._session.flush()
                return await self.get_cart_by_id(model.id)  # type: ignore[return-value]
            return guest_cart

        for line in guest_cart.lines:
            existing = next(
                (ul for ul in user_cart.lines if ul.variant_id == line.variant_id), None
            )
            new_qty = (existing.quantity if existing else 0) + line.quantity
            await self.upsert_cart_line(
                cart_id=user_cart.id,
                variant_id=line.variant_id,
                quantity=new_qty,
                unit_price_cents=line.unit_price_cents,
                currency=line.currency,
                snapshot=line.product_snapshot,
            )

        guest_result = await self._session.execute(
            select(CartModel).where(CartModel.id == guest_cart.id)
        )
        guest_model = guest_result.scalar_one_or_none()
        if guest_model:
            guest_model.status = CartStatus.ABANDONED.value
            await self._session.flush()

        merged = await self.get_cart_by_id(user_cart.id)
        assert merged is not None
        return merged

    async def commit(self) -> None:
        await self._session.commit()

    def generate_order_number(self) -> str:
        return _generate_order_number()
