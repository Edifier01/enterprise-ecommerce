"""Tests for structured variant option groups (ADR-011)."""

import uuid

import pytest

from app.features.catalog.domain.entities import ProductVariant
from app.features.catalog.domain.variant_options import (
    build_option_groups,
    pick_default_selection,
    resolve_variant,
    uses_structured_selector,
    variant_option_values,
)

_V1 = uuid.uuid4()
_V2 = uuid.uuid4()
_V3 = uuid.uuid4()
_PRODUCT_ID = uuid.uuid4()


def _variant(
    *,
    vid: uuid.UUID,
    color: str | None = None,
    size: str | None = None,
    in_stock: bool = True,
    is_default: bool = False,
    sort_order: int = 0,
) -> ProductVariant:
    attributes: dict[str, str] = {}
    if color:
        attributes["color"] = color
    if size:
        attributes["size"] = size
    return ProductVariant(
        id=vid,
        product_id=_PRODUCT_ID,
        sku=f"SKU-{vid.hex[:8]}",
        name=f"{color or 'Default'} / {size or 'OS'}",
        price_cents=500000,
        in_stock=in_stock,
        is_default=is_default,
        sort_order=sort_order,
        attributes=attributes,
    )


def test_build_option_groups_color_and_size() -> None:
    variants = (
        _variant(vid=_V1, color="Multicam", size="M", is_default=True, sort_order=0),
        _variant(vid=_V2, color="Multicam", size="L", sort_order=1),
        _variant(vid=_V3, color="Coyote", size="M", sort_order=2),
    )
    groups = build_option_groups(variants)
    assert [(group.key, list(group.values)) for group in groups] == [
        ("color", ["Multicam", "Coyote"]),
        ("size", ["M", "L"]),
    ]
    assert uses_structured_selector(groups, variant_count=len(variants)) is True


def test_resolve_variant_from_selection() -> None:
    variants = (
        _variant(vid=_V1, color="Multicam", size="M"),
        _variant(vid=_V2, color="Coyote", size="L"),
    )
    resolved = resolve_variant(variants, {"color": "Coyote", "size": "L"})
    assert resolved is not None
    assert resolved.id == _V2


def test_pick_default_selection_uses_default_variant() -> None:
    variants = (
        _variant(vid=_V1, color="Multicam", size="M", is_default=True),
        _variant(vid=_V2, color="Coyote", size="L"),
    )
    groups = build_option_groups(variants)
    selection = pick_default_selection(variants, groups)
    assert selection == {"color": "Multicam", "size": "M"}
    resolved = resolve_variant(variants, selection)
    assert resolved is not None
    assert resolved.id == _V1


def test_variant_option_values_normalizes_camouflage() -> None:
    variant = ProductVariant(
        id=_V1,
        product_id=_PRODUCT_ID,
        sku="JACKET-1",
        name="Woodland / L",
        price_cents=100,
        in_stock=True,
        is_default=True,
        sort_order=0,
        attributes={"camouflage": "woodland"},
    )
    assert variant_option_values(variant) == {"color": "Woodland"}


def test_no_structured_selector_for_single_variant() -> None:
    variants = (_variant(vid=_V1, color="Black", size="M"),)
    groups = build_option_groups(variants)
    assert uses_structured_selector(groups, variant_count=1) is False
