"use client";

import { FilteredProductList } from "@/components/store/catalog/filtered-product-list";
import type { ProductGridItem } from "@/components/store/catalog/product-grid";
import type { CatalogFilterFacets } from "@/lib/store/catalog-filters";
import type { CatalogListQuery } from "@/lib/store/catalog-query";

export interface CategoryProductListProps {
  products: ProductGridItem[];
  total: number;
  facets: CatalogFilterFacets;
  query: CatalogListQuery;
  emptyMessage?: string;
}

export function CategoryProductList({
  products,
  total,
  facets,
  query,
  emptyMessage,
}: CategoryProductListProps) {
  return (
    <FilteredProductList
      products={products}
      total={total}
      facets={facets}
      query={query}
      emptyMessage={emptyMessage}
    />
  );
}
