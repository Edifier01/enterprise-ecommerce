export type CatalogFilterState = {
  inStockOnly: boolean;
  onSaleOnly: boolean;
  sizes: string[];
  colors: string[];
  priceMin: number | null;
  priceMax: number | null;
};

export const EMPTY_CATALOG_FILTERS: CatalogFilterState = {
  inStockOnly: false,
  onSaleOnly: false,
  sizes: [],
  colors: [],
  priceMin: null,
  priceMax: null,
};

export type CatalogFilterFacets = {
  sizes: string[];
  colors: string[];
  priceRange: { min: number; max: number };
  sizeCounts: Record<string, number>;
  colorCounts: Record<string, number>;
};

export function countActiveFilters(filters: CatalogFilterState): number {
  let count = 0;
  if (filters.inStockOnly) count += 1;
  if (filters.onSaleOnly) count += 1;
  if (filters.sizes.length > 0) count += 1;
  if (filters.colors.length > 0) count += 1;
  if (filters.priceMin != null || filters.priceMax != null) count += 1;
  return count;
}
