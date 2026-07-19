"""Storefront stock availability rules."""

from app.core.config import settings


def is_in_stock_for_storefront(available_quantity: int) -> bool:
    """True when sellable quantity meets the configured storefront minimum."""
    return available_quantity >= settings.storefront_min_available_stock
