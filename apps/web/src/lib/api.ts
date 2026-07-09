import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  price_cents: number;
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

export async function listProducts(
  page = 1,
  limit = 20,
  categorySlug?: string
): Promise<ProductListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (categorySlug) {
    params.set("category", categorySlug);
  }
  const res = await fetch(`${API_BASE}/api/v1/products?${params}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function getProduct(slug: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/api/v1/products/${slug}`, {
    next: { revalidate: 60 },
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
