"""Catalog list filter and facet value objects."""

from dataclasses import dataclass
from typing import Literal

ProductSortOption = Literal[
    "default",
    "popular",
    "price_asc",
    "price_desc",
    "name_asc",
    "name_desc",
]


@dataclass(frozen=True)
class ProductListFilters:
    category_slug: str | None = None
    in_stock_only: bool = False
    on_sale_only: bool = False
    sizes: tuple[str, ...] = ()
    colors: tuple[str, ...] = ()
    price_min_cents: int | None = None
    price_max_cents: int | None = None
    sort: ProductSortOption = "default"


@dataclass(frozen=True)
class ProductListFacets:
    sizes: tuple[str, ...]
    colors: tuple[str, ...]
    price_min_cents: int
    price_max_cents: int
    size_counts: tuple[tuple[str, int], ...] = ()
    color_counts: tuple[tuple[str, int], ...] = ()
