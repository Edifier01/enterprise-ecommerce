import { getApiBase } from "@/lib/api-base";
import type { ProductListQueryParams, ProductFacetsResponse } from "@/lib/store/catalog-query";

const API_BASE = getApiBase();

export type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  price_cents: number;
  wholesale_price_cents?: number;
  in_stock: boolean;
  is_default: boolean;
  sort_order: number;
  attributes: Record<string, string>;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  in_stock: boolean;
  category_id: string | null;
  variants: ProductVariant[];
};

export type ProductListResponse = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
};

export type CategoryListResponse = {
  items: Category[];
  total: number;
};

export async function apiHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error("API unreachable");
  return res.json();
}

function buildProductListSearchParams(
  page: number,
  limit: number,
  categorySlug?: string,
  filters?: ProductListQueryParams,
): URLSearchParams {
  const params = new URLSearchParams({
    page: String(filters?.page ?? page),
    limit: String(filters?.limit ?? limit),
  });

  const category = filters?.category ?? categorySlug;
  if (category) {
    params.set("category", category);
  }
  if (filters?.in_stock) {
    params.set("in_stock", "true");
  }
  if (filters?.on_sale) {
    params.set("on_sale", "true");
  }
  for (const size of filters?.size ?? []) {
    params.append("size", size);
  }
  for (const color of filters?.color ?? []) {
    params.append("color", color);
  }
  if (filters?.price_min != null) {
    params.set("price_min", String(filters.price_min));
  }
  if (filters?.price_max != null) {
    params.set("price_max", String(filters.price_max));
  }
  if (filters?.sort && filters.sort !== "default") {
    params.set("sort", filters.sort.replace(/-/g, "_"));
  }

  return params;
}

export async function listProducts(
  page = 1,
  limit = 20,
  categorySlug?: string,
  accessToken?: string,
  filters?: ProductListQueryParams,
): Promise<ProductListResponse> {
  const params = buildProductListSearchParams(page, limit, categorySlug, filters);
  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(`${API_BASE}/api/v1/products?${params}`, {
    headers,
    ...(accessToken ? { cache: "no-store" } : { next: { revalidate: 60 } }),
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function getProductFacets(
  options?: { categorySlug?: string; searchQuery?: string },
  accessToken?: string,
): Promise<ProductFacetsResponse> {
  const params = new URLSearchParams();
  if (options?.categorySlug) {
    params.set("category", options.categorySlug);
  }
  if (options?.searchQuery) {
    params.set("q", options.searchQuery);
  }
  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const query = params.toString();
  const res = await fetch(
    `${API_BASE}/api/v1/products/facets${query ? `?${query}` : ""}`,
    {
      headers,
      ...(accessToken ? { cache: "no-store" } : { next: { revalidate: 300 } }),
    },
  );
  if (!res.ok) throw new Error("Failed to fetch product facets");
  return res.json();
}

export async function searchProducts(
  query: string,
  page = 1,
  limit = 24,
  accessToken?: string,
  filters?: ProductListQueryParams,
): Promise<ProductListResponse> {
  const params = buildProductListSearchParams(page, limit, undefined, filters);
  params.set("q", query);
  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(`${API_BASE}/api/v1/products/search?${params}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to search products");
  return res.json();
}

export async function getProduct(slug: string, accessToken?: string): Promise<Product> {
  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(`${API_BASE}/api/v1/products/${slug}`, {
    headers,
    ...(accessToken ? { cache: "no-store" } : { next: { revalidate: 60 } }),
  });
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}

export async function getCategories(): Promise<CategoryListResponse> {
  const res = await fetch(`${API_BASE}/api/v1/categories`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export { formatPrice } from "@/lib/store/format";
