"""Inventory domain ports."""

from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from app.features.inventory.domain.entities import InventoryItem, InventoryReservation


class IInventoryRepository(ABC):
    @abstractmethod
    async def get_available_quantity(self, variant_id: UUID) -> int:
        pass

    @abstractmethod
    async def lock_items_by_variant_ids(self, variant_ids: list[UUID]) -> dict[UUID, InventoryItem]:
        pass

    @abstractmethod
    async def increment_reserved(self, variant_id: UUID, quantity: int) -> None:
        pass

    @abstractmethod
    async def release_reserved(self, variant_id: UUID, quantity: int) -> None:
        pass

    @abstractmethod
    async def deduct_reserved(self, variant_id: UUID, quantity: int) -> None:
        pass

    @abstractmethod
    async def restore_on_hand(self, variant_id: UUID, quantity: int) -> None:
        pass

    @abstractmethod
    async def get_active_reservations(
        self, reference_type: str, reference_id: UUID
    ) -> list[InventoryReservation]:
        pass

    @abstractmethod
    async def create_reservation(
        self,
        *,
        variant_id: UUID,
        quantity: int,
        reference_type: str,
        reference_id: UUID,
        expires_at: datetime,
    ) -> InventoryReservation:
        pass

    @abstractmethod
    async def set_reservation_status(self, reservation_id: UUID, status: str) -> None:
        pass

    @abstractmethod
    async def refresh_reservation_expiry(
        self, reservation_id: UUID, expires_at: datetime
    ) -> None:
        pass

    @abstractmethod
    async def get_expired_active_reservations(self, now: datetime) -> list[InventoryReservation]:
        pass
