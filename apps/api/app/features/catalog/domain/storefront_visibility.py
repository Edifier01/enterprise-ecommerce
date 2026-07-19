"""Rules for which products appear on the public storefront."""

from sqlalchemy import ColumnElement, or_

from app.features.catalog.infrastructure.persistence.models import ProductModel

SYNC_SOURCE_MOYSKLAD = "moysklad"


def storefront_visibility_filter() -> ColumnElement[bool]:
    """MoySklad products require an admin-assigned category to appear on the storefront."""
    return or_(
        ProductModel.sync_source != SYNC_SOURCE_MOYSKLAD,
        ProductModel.category_id.is_not(None),
    )
