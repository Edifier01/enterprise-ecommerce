"""MoySklad integration domain ports."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class MoySkladProduct:
    """Normalized product from MoySklad ACL."""

    external_id: str
    name: str
    code: str | None
    archived: bool
    folder_id: str | None
    image_url: str | None
    retail_price_cents: int = 0
    wholesale_price_cents: int | None = None
    barcode: str | None = None
    weight_grams: int | None = None


@dataclass(frozen=True, slots=True)
class MoySkladVariant:
    """Normalized variant (modification) from MoySklad ACL."""

    external_id: str
    product_external_id: str
    name: str
    sku: str
    archived: bool
    attributes: dict[str, str]
    retail_price_cents: int
    wholesale_price_cents: int | None
    barcode: str | None
    weight_grams: int | None
    dimensions_cm: dict[str, float] | None


@dataclass(frozen=True, slots=True)
class MoySkladStockBalance:
    variant_external_id: str
    quantity: int


class IMoySkladClient(ABC):
    @abstractmethod
    async def list_products(self, *, offset: int = 0, limit: int = 100) -> tuple[list[MoySkladProduct], int]:
        ...

    @abstractmethod
    async def list_variants(self, *, offset: int = 0, limit: int = 100) -> tuple[list[MoySkladVariant], int]:
        ...

    @abstractmethod
    async def list_stock_by_store(
        self, *, offset: int = 0, limit: int = 1000
    ) -> tuple[dict[str, int], int]:
        """Return map of assortment id (product or variant UUID) -> stock quantity."""
        ...

    @abstractmethod
    async def get_product(self, product_id: str) -> MoySkladProduct | None:
        ...

    @abstractmethod
    async def get_variant(self, variant_id: str) -> MoySkladVariant | None:
        ...

    @abstractmethod
    async def list_variants_for_product(self, product_id: str) -> list[MoySkladVariant]:
        ...

    async def get_assortment_stock(self, assortment_id: str) -> int:
        ...

    @abstractmethod
    async def get_customer_order(self, order_id: str) -> dict[str, str | bool | None] | None:
        """Fetch raw customer order entity for return/cancel sync."""
        ...
