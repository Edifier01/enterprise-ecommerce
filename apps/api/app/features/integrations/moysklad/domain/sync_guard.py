"""Field ownership guards for MoySklad-synced catalog entities (ADR-010)."""

from dataclasses import dataclass

SYNC_SOURCE_MOYSKLAD = "moysklad"
SYNC_SOURCE_MANUAL = "manual"

_MS_READONLY_HINT = (
    "Это поле управляется в МойСклад. Измените его там — сайт подтянет автоматически."
)


class SyncProtectedFieldError(Exception):
    """Raised when admin attempts to mutate a MoySklad-owned field locally."""


@dataclass(frozen=True, slots=True)
class UpdateProductDataLike:
    price_cents: int | None = None
    currency: str | None = None


@dataclass(frozen=True, slots=True)
class UpdateVariantDataLike:
    sku: str | None = None
    price_cents: int | None = None
    wholesale_price_cents: int | None = None
    attributes: dict[str, str] | None = None


def assert_product_update_allowed(sync_source: str, data: UpdateProductDataLike) -> None:
    if sync_source != SYNC_SOURCE_MOYSKLAD:
        return
    if data.price_cents is not None or data.currency is not None:
        raise SyncProtectedFieldError(_MS_READONLY_HINT)


def assert_variant_update_allowed(sync_source: str, data: UpdateVariantDataLike) -> None:
    if sync_source != SYNC_SOURCE_MOYSKLAD:
        return
    protected = (
        data.sku is not None
        or data.price_cents is not None
        or data.wholesale_price_cents is not None
        or data.attributes is not None
    )
    if protected:
        raise SyncProtectedFieldError(_MS_READONLY_HINT)


def assert_variant_create_allowed(sync_source: str) -> None:
    if sync_source == SYNC_SOURCE_MOYSKLAD:
        raise SyncProtectedFieldError(
            "Модификации создаются в МойСклад. Сайт импортирует их автоматически."
        )


def assert_inventory_adjust_allowed(sync_source: str) -> None:
    if sync_source == SYNC_SOURCE_MOYSKLAD:
        raise SyncProtectedFieldError(
            "Остатки управляются в МойСклад. Сайт подтягивает их автоматически."
        )
