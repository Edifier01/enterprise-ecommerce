"""Inventory SQLAlchemy repository."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.inventory.domain.entities import (
    InventoryItem,
    InventoryReservation,
    InventoryReservationStatus,
)
from app.features.inventory.domain.ports import IInventoryRepository
from app.features.inventory.infrastructure.persistence.models import (
    InventoryItemModel,
    InventoryReservationModel,
)


def _item_from_model(model: InventoryItemModel) -> InventoryItem:
    return InventoryItem(
        id=model.id,
        variant_id=model.variant_id,
        quantity_on_hand=model.quantity_on_hand,
        quantity_reserved=model.quantity_reserved,
        version=model.version,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _reservation_from_model(model: InventoryReservationModel) -> InventoryReservation:
    return InventoryReservation(
        id=model.id,
        variant_id=model.variant_id,
        quantity=model.quantity,
        reference_type=model.reference_type,
        reference_id=model.reference_id,
        status=InventoryReservationStatus(model.status),
        expires_at=model.expires_at,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


class InventoryRepository(IInventoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_available_quantity(self, variant_id: UUID) -> int:
        result = await self._session.execute(
            select(InventoryItemModel).where(InventoryItemModel.variant_id == variant_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            return 0
        return model.quantity_on_hand - model.quantity_reserved

    async def lock_items_by_variant_ids(self, variant_ids: list[UUID]) -> dict[UUID, InventoryItem]:
        if not variant_ids:
            return {}
        ordered_ids = sorted(set(variant_ids), key=str)
        result = await self._session.execute(
            select(InventoryItemModel)
            .where(InventoryItemModel.variant_id.in_(ordered_ids))
            .order_by(InventoryItemModel.variant_id)
            .with_for_update()
        )
        return {model.variant_id: _item_from_model(model) for model in result.scalars().all()}

    async def _get_item_model(self, variant_id: UUID) -> InventoryItemModel | None:
        result = await self._session.execute(
            select(InventoryItemModel).where(InventoryItemModel.variant_id == variant_id)
        )
        return result.scalar_one_or_none()

    async def increment_reserved(self, variant_id: UUID, quantity: int) -> None:
        model = await self._get_item_model(variant_id)
        if model is None:
            return
        model.quantity_reserved += quantity
        model.version += 1
        await self._session.flush()

    async def release_reserved(self, variant_id: UUID, quantity: int) -> None:
        model = await self._get_item_model(variant_id)
        if model is None:
            return
        model.quantity_reserved -= quantity
        model.version += 1
        await self._session.flush()

    async def deduct_reserved(self, variant_id: UUID, quantity: int) -> None:
        model = await self._get_item_model(variant_id)
        if model is None:
            return
        model.quantity_on_hand -= quantity
        model.quantity_reserved -= quantity
        model.version += 1
        await self._session.flush()

    async def restore_on_hand(self, variant_id: UUID, quantity: int) -> None:
        model = await self._get_item_model(variant_id)
        if model is None:
            return
        model.quantity_on_hand += quantity
        model.version += 1
        await self._session.flush()

    async def get_active_reservations(
        self, reference_type: str, reference_id: UUID
    ) -> list[InventoryReservation]:
        result = await self._session.execute(
            select(InventoryReservationModel)
            .where(
                InventoryReservationModel.reference_type == reference_type,
                InventoryReservationModel.reference_id == reference_id,
                InventoryReservationModel.status == InventoryReservationStatus.ACTIVE.value,
            )
            .order_by(InventoryReservationModel.variant_id)
        )
        return [_reservation_from_model(model) for model in result.scalars().all()]

    async def create_reservation(
        self,
        *,
        variant_id: UUID,
        quantity: int,
        reference_type: str,
        reference_id: UUID,
        expires_at: datetime,
    ) -> InventoryReservation:
        model = InventoryReservationModel(
            variant_id=variant_id,
            quantity=quantity,
            reference_type=reference_type,
            reference_id=reference_id,
            status=InventoryReservationStatus.ACTIVE.value,
            expires_at=expires_at,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _reservation_from_model(model)

    async def set_reservation_status(self, reservation_id: UUID, status: str) -> None:
        result = await self._session.execute(
            select(InventoryReservationModel).where(InventoryReservationModel.id == reservation_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            return
        model.status = status
        await self._session.flush()

    async def refresh_reservation_expiry(self, reservation_id: UUID, expires_at: datetime) -> None:
        result = await self._session.execute(
            select(InventoryReservationModel).where(InventoryReservationModel.id == reservation_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            return
        model.expires_at = expires_at
        await self._session.flush()

    async def get_expired_active_reservations(self, now: datetime) -> list[InventoryReservation]:
        result = await self._session.execute(
            select(InventoryReservationModel)
            .where(
                InventoryReservationModel.status == InventoryReservationStatus.ACTIVE.value,
                InventoryReservationModel.expires_at <= now,
            )
            .order_by(InventoryReservationModel.variant_id)
        )
        return [_reservation_from_model(model) for model in result.scalars().all()]
