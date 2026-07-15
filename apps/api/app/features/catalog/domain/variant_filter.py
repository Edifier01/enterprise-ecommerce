"""Variant attribute helpers for catalog filtering and facets."""

from app.features.catalog.domain.entities import Product, ProductVariant
from app.features.catalog.domain.product_list_filters import ProductListFacets

_COLOR_KEYWORDS: dict[str, str] = {
    "multicam": "Multicam",
    "coyote": "Coyote",
    "olive": "Olive",
    "black": "Black",
    "ranger green": "Ranger Green",
    "woodland": "Woodland",
}


def _normalize_color(value: str) -> str | None:
    lower = value.casefold()
    for keyword, label in _COLOR_KEYWORDS.items():
        if keyword in lower:
            return label
    stripped = value.strip()
    return stripped or None


def _extract_colors(product: Product) -> set[str]:
    colors: set[str] = set()
    for variant in product.variants:
        explicit = variant.attributes.get("color") or variant.attributes.get("camouflage")
        if explicit:
            normalized = _normalize_color(explicit) or explicit.strip()
            if normalized:
                colors.add(normalized)
    from_name = _normalize_color(product.name)
    if from_name:
        colors.add(from_name)
    return colors


def _extract_sizes(variant: ProductVariant) -> set[str]:
    sizes: set[str] = set()
    size = (variant.attributes.get("size") or "").strip()
    if size:
        sizes.add(size)
    waist = (variant.attributes.get("waist") or "").strip()
    if waist:
        sizes.add(f"W{waist}")
    if variant.name and variant.name != "Default":
        sizes.add(variant.name)
    return sizes


def build_facets_from_products(products: list[Product]) -> ProductListFacets:
    sizes: set[str] = set()
    colors: set[str] = set()
    min_price = 0
    max_price = 0

    for product in products:
        for variant in product.variants:
            sizes.update(_extract_sizes(variant))
        colors.update(_extract_colors(product))
        if product.price_cents > max_price:
            max_price = product.price_cents
        if min_price == 0 or product.price_cents < min_price:
            min_price = product.price_cents

    return ProductListFacets(
        sizes=tuple(sorted(sizes)),
        colors=tuple(sorted(colors)),
        price_min_cents=min_price,
        price_max_cents=max_price,
    )
