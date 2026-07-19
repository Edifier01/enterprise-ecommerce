"""Ports for MoySklad outbound order export (site → MS)."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class OrderExportLine:
    quantity: int
    unit_price_cents: int
    moysklad_assortment_id: str
    assortment_type: str  # "variant" | "product"


@dataclass(frozen=True, slots=True)
class OrderExportPayload:
    order_id: UUID
    order_number: str
    customer_email: str | None
    currency: str
    moysklad_order_id: str | None
    lines: tuple[OrderExportLine, ...]


class IMoySkladOrderExportClient(ABC):
    @abstractmethod
    async def find_counterparty_by_email(self, email: str) -> str | None:
        """Return counterparty UUID if found."""

    @abstractmethod
    async def create_counterparty(self, *, email: str, name: str) -> str:
        """Create counterparty and return UUID."""

    @abstractmethod
    async def create_customer_order(
        self,
        *,
        order_number: str,
        organization_id: str,
        counterparty_id: str,
        store_id: str,
        lines: tuple[OrderExportLine, ...],
        description: str | None = None,
    ) -> str:
        """Create customer order and return MS order UUID."""

    @abstractmethod
    async def get_default_organization_id(self) -> str | None:
        """Resolve organization UUID when not configured explicitly."""
