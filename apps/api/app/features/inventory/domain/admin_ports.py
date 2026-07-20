"""Admin inventory repository port."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID

INVENTORY_ADJUST_REASONS = frozenset({"restock", "damage", "correction", "return"})


class InventoryItemNotFoundError(Exception):
    """Raised when no inventory row exists for the variant."""


class VersionConflictError(Exception):
    """Raised when optimistic version does not match."""


class InsufficientOnHandError(Exception):
    """Raised when on_hand would drop below reserved quantity."""

    def __init__(self, reserved_quantity: int) -> None:
        self.reserved_quantity = reserved_quantity
        super().__init__(str(reserved_quantity))


@dataclass(frozen=True, slots=True)
class AdminInventoryRow:
    variant_id: UUID
    sku: str
    product_name: str
    sync_source: str
    quantity_on_hand: int
    quantity_reserved: int
    available: int
    version: int
    is_low_stock: bool


class IAdminInventoryRepository(ABC):
    @abstractmethod
    async def list_inventory(
        self,
        *,
        page: int,
        limit: int,
        low_stock_only: bool,
        low_stock_threshold: int,
        sku_query: str | None = None,
    ) -> tuple[list[AdminInventoryRow], int]:
        ...

    @abstractmethod
    async def adjust_quantity_on_hand(
        self,
        variant_id: UUID,
        quantity_on_hand: int,
        expected_version: int,
        low_stock_threshold: int,
    ) -> AdminInventoryRow:
        ...
