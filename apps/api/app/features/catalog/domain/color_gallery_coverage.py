"""Color gallery coverage helpers for admin merchandising (ADR-011)."""

from app.features.catalog.domain.entities import ProductVariant
from app.features.catalog.domain.variant_filter import _normalize_color


def extract_variant_colors(variants: tuple[ProductVariant, ...] | list[ProductVariant]) -> frozenset[str]:
    colors: set[str] = set()
    for variant in variants:
        for key in ("color", "camouflage"):
            raw = (variant.attributes.get(key) or "").strip()
            if not raw:
                continue
            normalized = _normalize_color(raw) or raw.strip()
            if normalized:
                colors.add(normalized)
            break
    return frozenset(colors)


def needs_color_photos(
    variants: tuple[ProductVariant, ...] | list[ProductVariant],
    image_option_colors: list[str | None],
) -> bool:
    required = extract_variant_colors(variants)
    if len(required) < 2:
        return False
    tagged = frozenset(color for color in image_option_colors if color)
    return not required.issubset(tagged)
