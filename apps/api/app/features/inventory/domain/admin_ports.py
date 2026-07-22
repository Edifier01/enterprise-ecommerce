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
    product_id: UUID
    sku: str
    product_name: str
    sync_source: str
    quantity_on_hand: int
    quantity_reserved: int
    available: int
    version: int
    is_low_stock: bool


@dataclass(frozen=True, slots=True)
class AdminInventoryProductGroup:
    product_id: UUID
    product_name: str
    sync_source: str
    total_on_hand: int
    total_reserved: int
    total_available: int
    is_low_stock: bool
    variant_count: int
    variants: tuple[AdminInventoryRow, ...]


@dataclass(frozen=True, slots=True)
class AdminInventoryOverview:
    total_variants: int
    total_products: int
    low_stock_variants: int
    low_stock_products: int
    out_of_stock_variants: int
    out_of_stock_products: int
    low_stock_threshold: int


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
    async def list_inventory_grouped_by_product(
        self,
        *,
        page: int,
        limit: int,
        low_stock_only: bool,
        low_stock_threshold: int,
        sku_query: str | None = None,
    ) -> tuple[list[AdminInventoryProductGroup], int]:
        ...

    @abstractmethod
    async def get_inventory_overview(self, *, low_stock_threshold: int) -> AdminInventoryOverview:
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
