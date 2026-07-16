"""Variant attribute helpers for catalog filtering and facets."""

from collections import Counter

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


def _price_bounds(products: list[Product]) -> tuple[int, int]:
    min_price = 0
    max_price = 0
    for product in products:
        if product.price_cents > max_price:
            max_price = product.price_cents
        if min_price == 0 or product.price_cents < min_price:
            min_price = product.price_cents
    return min_price, max_price


def _count_sizes(products: list[Product]) -> tuple[tuple[str, ...], tuple[tuple[str, int], ...]]:
    counter: Counter[str] = Counter()
    for product in products:
        product_sizes: set[str] = set()
        for variant in product.variants:
            product_sizes.update(_extract_sizes(variant))
        for size in product_sizes:
            counter[size] += 1
    ordered = tuple(sorted(counter))
    return ordered, tuple(sorted(counter.items()))


def _count_colors(products: list[Product]) -> tuple[tuple[str, ...], tuple[tuple[str, int], ...]]:
    counter: Counter[str] = Counter()
    for product in products:
        product_colors = _extract_colors(product)
        for color in product_colors:
            counter[color] += 1
    ordered = tuple(sorted(counter))
    return ordered, tuple(sorted(counter.items()))


def build_facets_from_products(products: list[Product]) -> ProductListFacets:
    sizes, size_counts = _count_sizes(products)
    colors, color_counts = _count_colors(products)
    min_price, max_price = _price_bounds(products)
    return ProductListFacets(
        sizes=sizes,
        colors=colors,
        price_min_cents=min_price,
        price_max_cents=max_price,
        size_counts=size_counts,
        color_counts=color_counts,
    )


def build_facets_with_scoped_products(
    *,
    size_products: list[Product],
    color_products: list[Product],
    price_products: list[Product],
) -> ProductListFacets:
    sizes, size_counts = _count_sizes(size_products)
    colors, color_counts = _count_colors(color_products)
    min_price, max_price = _price_bounds(price_products)
    return ProductListFacets(
        sizes=sizes,
        colors=colors,
        price_min_cents=min_price,
        price_max_cents=max_price,
        size_counts=size_counts,
        color_counts=color_counts,
    )
