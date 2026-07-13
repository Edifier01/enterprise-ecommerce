"""Retail vs wholesale price resolution (ADR-008)."""

from dataclasses import dataclass
from enum import StrEnum

from app.features.catalog.domain.entities import ProductVariant


class PriceTier(StrEnum):
    RETAIL = "retail"
    WHOLESALE = "wholesale"


class WholesalePriceUnavailableError(Exception):
    """Raised when a wholesaler attempts to buy a variant without wholesale price."""


@dataclass(frozen=True, slots=True)
class ResolvedVariantPrice:
    unit_price_cents: int
    tier: PriceTier
    retail_price_cents: int
    wholesale_price_cents: int


def resolve_variant_price(
    variant: ProductVariant,
    *,
    is_wholesaler: bool,
) -> ResolvedVariantPrice:
    retail = variant.price_cents
    wholesale = variant.wholesale_price_cents
    if is_wholesaler:
        if wholesale is None:
            raise WholesalePriceUnavailableError(
                f"Wholesale price is not set for variant {variant.sku}"
            )
        return ResolvedVariantPrice(
            unit_price_cents=wholesale,
            tier=PriceTier.WHOLESALE,
            retail_price_cents=retail,
            wholesale_price_cents=wholesale,
        )
    return ResolvedVariantPrice(
        unit_price_cents=retail,
        tier=PriceTier.RETAIL,
        retail_price_cents=retail,
        wholesale_price_cents=wholesale if wholesale is not None else retail,
    )
