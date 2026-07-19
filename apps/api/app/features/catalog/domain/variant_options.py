"""Structured variant option groups for storefront selectors (ADR-011)."""

from dataclasses import dataclass

from app.features.catalog.domain.entities import ProductVariant
from app.features.catalog.domain.variant_filter import _normalize_color

_OPTION_AXES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("color", "Цвет / камуфляж", ("color", "camouflage")),
    ("size", "Размер", ("size",)),
    ("waist", "Талия", ("waist",)),
)


@dataclass(frozen=True, slots=True)
class ProductOptionGroup:
    key: str
    label: str
    values: tuple[str, ...]


def _axis_value(variant: ProductVariant, attribute_keys: tuple[str, ...]) -> str | None:
    for key in attribute_keys:
        raw = (variant.attributes.get(key) or "").strip()
        if not raw:
            continue
        if key in {"color", "camouflage"}:
            normalized = _normalize_color(raw) or raw
            return normalized
        return raw
    return None


def variant_option_values(variant: ProductVariant) -> dict[str, str]:
    """Map axis key -> selected value for one variant."""
    selected: dict[str, str] = {}
    for axis_key, _label, attribute_keys in _OPTION_AXES:
        value = _axis_value(variant, attribute_keys)
        if value:
            selected[axis_key] = value
    return selected


def build_option_groups(variants: tuple[ProductVariant, ...]) -> tuple[ProductOptionGroup, ...]:
    if not variants:
        return ()

    groups: list[ProductOptionGroup] = []
    for axis_key, label, attribute_keys in _OPTION_AXES:
        values: list[str] = []
        seen: set[str] = set()
        for variant in sorted(variants, key=lambda item: item.sort_order):
            value = _axis_value(variant, attribute_keys)
            if value and value not in seen:
                seen.add(value)
                values.append(value)
        if values:
            groups.append(ProductOptionGroup(key=axis_key, label=label, values=tuple(values)))
    return tuple(groups)


def uses_structured_selector(
    option_groups: tuple[ProductOptionGroup, ...],
    *,
    variant_count: int | None = None,
) -> bool:
    if variant_count is not None and variant_count <= 1:
        return False
    if not option_groups:
        return False
    total_values = sum(len(group.values) for group in option_groups)
    return total_values > 1


def resolve_variant(
    variants: tuple[ProductVariant, ...],
    selected: dict[str, str],
) -> ProductVariant | None:
    if not variants or not selected:
        return None
    for variant in variants:
        options = variant_option_values(variant)
        if all(options.get(key) == value for key, value in selected.items()):
            return variant
    return None


def pick_default_selection(
    variants: tuple[ProductVariant, ...],
    option_groups: tuple[ProductOptionGroup, ...],
) -> dict[str, str]:
    if not variants or not option_groups:
        return {}

    default = next((variant for variant in variants if variant.is_default), variants[0])
    default_options = variant_option_values(default)
    selection = {group.key: default_options[group.key] for group in option_groups if group.key in default_options}

    for group in option_groups:
        if group.key in selection:
            continue
        for value in group.values:
            trial = {**selection, group.key: value}
            if resolve_variant(variants, trial) is not None:
                selection[group.key] = value
                break
    return selection
