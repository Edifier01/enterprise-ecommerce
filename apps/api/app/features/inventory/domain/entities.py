"""Inventory domain entities and value objects."""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID


class InventoryReservationStatus(StrEnum):
    ACTIVE = "active"
    COMMITTED = "committed"
    RELEASED = "released"
    EXPIRED = "expired"


@dataclass(frozen=True)
class InventoryReservationRequestLine:
    variant_id: UUID
    quantity: int


@dataclass(frozen=True)
class InventoryItem:
    id: UUID
    variant_id: UUID
    quantity_on_hand: int
    quantity_reserved: int
    version: int
    created_at: datetime
    updated_at: datetime

    @property
    def available_quantity(self) -> int:
        return self.quantity_on_hand - self.quantity_reserved


@dataclass(frozen=True)
class InventoryReservation:
    id: UUID
    variant_id: UUID
    quantity: int
    reference_type: str
    reference_id: UUID
    status: InventoryReservationStatus
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
