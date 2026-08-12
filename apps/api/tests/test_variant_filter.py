"""Variant facet extraction should only expose canonical option values."""

from uuid import uuid4

from app.features.catalog.domain.entities import ProductVariant
from app.features.catalog.domain.variant_filter import _extract_sizes


def test_extract_sizes_uses_alias_or_name_size_without_full_variant_name() -> None:
    variant = ProductVariant(
        id=uuid4(),
        product_id=uuid4(),
        sku="SHOE-39",
        name="Кроссовки Elkland (39)",
        price_cents=100,
        in_stock=True,
        is_default=True,
        sort_order=0,
        attributes={"размер обуви": "39"},
    )

    assert _extract_sizes(variant) == {"39"}
    assert "Кроссовки Elkland (39)" not in _extract_sizes(variant)


def test_extract_sizes_parses_parenthesized_size_when_attributes_missing() -> None:
    variant = ProductVariant(
        id=uuid4(),
        product_id=uuid4(),
        sku="SHOE-40",
        name="Кроссовки Elkland (40)",
        price_cents=100,
        in_stock=True,
        is_default=False,
        sort_order=1,
        attributes={},
    )

    assert _extract_sizes(variant) == {"40"}
