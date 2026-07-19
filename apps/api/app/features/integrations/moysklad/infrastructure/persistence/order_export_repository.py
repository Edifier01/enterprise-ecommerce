"""Repository for loading orders and persisting MoySklad export state."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.auth.infrastructure.persistence.models import UserModel
from app.features.catalog.infrastructure.persistence.models import (
    ProductModel,
    ProductVariantModel,
)
from app.features.checkout.domain.entities import OrderStatus
from app.features.checkout.infrastructure.persistence.models import OrderModel
from app.features.integrations.moysklad.domain.order_export_ports import (
    OrderExportLine,
    OrderExportPayload,
)


class OrderExportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def load_for_export(self, order_id: uuid.UUID) -> OrderExportPayload | None:
        stmt = (
            select(OrderModel, UserModel.email)
            .outerjoin(UserModel, OrderModel.customer_id == UserModel.id)
            .where(OrderModel.id == order_id)
            .options(selectinload(OrderModel.lines))
        )
        row = (await self._session.execute(stmt)).one_or_none()
        if row is None:
            return None

        order, customer_email = row
        email = customer_email or order.guest_email

        variant_ids = [line.variant_id for line in order.lines]
        variant_rows = (
            await self._session.execute(
                select(ProductVariantModel, ProductModel.moysklad_product_id)
                .join(ProductModel, ProductVariantModel.product_id == ProductModel.id)
                .where(ProductVariantModel.id.in_(variant_ids))
            )
        ).all()
        variant_map = {
            variant.id: (variant.moysklad_variant_id, product_ms_id)
            for variant, product_ms_id in variant_rows
        }

        export_lines: list[OrderExportLine] = []
        for line in order.lines:
            ms_variant_id, ms_product_id = variant_map.get(line.variant_id, (None, None))
            if ms_variant_id:
                export_lines.append(
                    OrderExportLine(
                        quantity=line.quantity,
                        unit_price_cents=line.unit_price_cents,
                        moysklad_assortment_id=ms_variant_id,
                        assortment_type="variant",
                    )
                )
            elif ms_product_id:
                export_lines.append(
                    OrderExportLine(
                        quantity=line.quantity,
                        unit_price_cents=line.unit_price_cents,
                        moysklad_assortment_id=ms_product_id,
                        assortment_type="product",
                    )
                )

        return OrderExportPayload(
            order_id=order.id,
            order_number=order.order_number,
            customer_email=email,
            currency=order.currency,
            moysklad_order_id=order.moysklad_order_id,
            lines=tuple(export_lines),
        )

    async def set_moysklad_order_id(self, order_id: uuid.UUID, moysklad_order_id: str) -> None:
        order = await self._session.get(OrderModel, order_id)
        if order is None:
            return
        order.moysklad_order_id = moysklad_order_id
        await self._session.flush()

    async def list_pending_export_ids(self, *, limit: int = 20) -> list[uuid.UUID]:
        stmt = (
            select(OrderModel.id)
            .where(
                OrderModel.status == OrderStatus.CONFIRMED.value,
                OrderModel.moysklad_order_id.is_(None),
            )
            .order_by(OrderModel.created_at.asc())
            .limit(limit)
        )
        return list((await self._session.scalars(stmt)).all())

    async def get_order_id_by_number(self, order_number: str) -> uuid.UUID | None:
        stmt = select(OrderModel.id).where(OrderModel.order_number == order_number)
        return await self._session.scalar(stmt)

    async def get_order_number_by_moysklad_id(self, moysklad_order_id: str) -> str | None:
        stmt = select(OrderModel.order_number).where(OrderModel.moysklad_order_id == moysklad_order_id)
        return await self._session.scalar(stmt)

    async def count_pending_exports(self) -> int:
        from sqlalchemy import func

        stmt = (
            select(func.count())
            .select_from(OrderModel)
            .where(
                OrderModel.status == OrderStatus.CONFIRMED.value,
                OrderModel.moysklad_order_id.is_(None),
            )
        )
        return int((await self._session.scalar(stmt)) or 0)
