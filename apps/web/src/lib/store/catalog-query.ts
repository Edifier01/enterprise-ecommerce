import type { SortOptionValue } from "@/components/store/catalog/sort-toolbar";
import type { CatalogFilterState } from "@/lib/store/catalog-filters";

export type CatalogListQuery = CatalogFilterState & {
  sort: SortOptionValue;
};

export type ProductListQueryParams = {
  page?: number;
  limit?: number;
  category?: string;
  in_stock?: boolean;
  on_sale?: boolean;
  size?: string[];
  color?: string[];
  price_min?: number;
  price_max?: number;
  sort?: string;
};

export type ProductFacetsResponse = {
  sizes: string[];
  colors: string[];
  price_min_cents: number;
  price_max_cents: number;
};

export const DEFAULT_CATALOG_LIST_QUERY: CatalogListQuery = {
  inStockOnly: false,
  onSaleOnly: false,
  sizes: [],
  colors: [],
  priceMin: null,
  priceMax: null,
  sort: "default",
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function readParamList(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const value = params[key];
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function parseCatalogSearchParams(
  params: Record<string, string | string[] | undefined>,
): CatalogListQuery {
  const sort = readParam(params, "sort");
  const priceMinRaw = readParam(params, "price_min");
  const priceMaxRaw = readParam(params, "price_max");

  return {
    inStockOnly: readParam(params, "in_stock") === "1",
    onSaleOnly: readParam(params, "on_sale") === "1",
    sizes: readParamList(params, "size"),
    colors: readParamList(params, "color"),
    priceMin: priceMinRaw ? Number(priceMinRaw) * 100 : null,
    priceMax: priceMaxRaw ? Number(priceMaxRaw) * 100 : null,
    sort:
      sort === "price-asc" ||
      sort === "price-desc" ||
      sort === "name-asc" ||
      sort === "name-desc" ||
      sort === "default"
        ? sort
        : "default",
  };
}

export function toApiSortValue(sort: SortOptionValue): string {
  return sort.replace(/-/g, "_");
}

export function catalogQueryToApiParams(
  query: CatalogListQuery,
  options?: { categorySlug?: string; page?: number; limit?: number },
): ProductListQueryParams {
  const params: ProductListQueryParams = {
    page: options?.page ?? 1,
    limit: options?.limit ?? 48,
    sort: toApiSortValue(query.sort),
  };

  if (options?.categorySlug) {
    params.category = options.categorySlug;
  }
  if (query.inStockOnly) {
    params.in_stock = true;
  }
  if (query.onSaleOnly) {
    params.on_sale = true;
  }
  if (query.sizes.length > 0) {
    params.size = query.sizes;
  }
  if (query.colors.length > 0) {
    params.color = query.colors;
  }
  if (query.priceMin != null) {
    params.price_min = query.priceMin;
  }
  if (query.priceMax != null) {
    params.price_max = query.priceMax;
  }

  return params;
}

export function buildCatalogSearchParams(
  query: CatalogListQuery,
  options?: { searchQuery?: string },
): URLSearchParams {
  const params = new URLSearchParams();

  if (options?.searchQuery) {
    params.set("q", options.searchQuery);
  }

  if (query.inStockOnly) {
    params.set("in_stock", "1");
  }
  if (query.onSaleOnly) {
    params.set("on_sale", "1");
  }
  for (const size of query.sizes) {
    params.append("size", size);
  }
  for (const color of query.colors) {
    params.append("color", color);
  }
  if (query.priceMin != null) {
    params.set("price_min", String(Math.round(query.priceMin / 100)));
  }
  if (query.priceMax != null) {
    params.set("price_max", String(Math.round(query.priceMax / 100)));
  }
  if (query.sort !== "default") {
    params.set("sort", query.sort);
  }

  return params;
}

export function apiFacetsToCatalogFacets(facets: ProductFacetsResponse) {
  return {
    sizes: facets.sizes,
    colors: facets.colors,
    priceRange: {
      min: facets.price_min_cents,
      max: facets.price_max_cents,
    },
  };
}
