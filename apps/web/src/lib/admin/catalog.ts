import { getAdminAccessToken } from "@/lib/admin/session";
import { siteConfig } from "@/lib/store/site-config";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type ProductImage = {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  in_stock: boolean;
  status: string;
  category_id: string | null;
  description: string | null;
  image_url: string | null;
  sync_source: string;
  erp_name: string | null;
  moysklad_product_id: string | null;
  last_synced_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  erp_image_url: string | null;
  images: ProductImage[];
  variants: Array<{
    id: string;
    sku: string;
    name: string;
    price_cents: number;
    wholesale_price_cents?: number | null;
    in_stock: boolean;
    is_default: boolean;
    sort_order: number;
    attributes: Record<string, string>;
    moysklad_variant_id?: string | null;
    barcode?: string | null;
    weight_grams?: number | null;
    dimensions_cm?: Record<string, number> | null;
  }>;
};

export type AdminProductList = {
  items: AdminProduct[];
  total: number;
  page: number;
  limit: number;
};

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  product_count: number;
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = await getAdminAccessToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export const ADMIN_CATALOG_PAGE_SIZE = 20;
export const ADMIN_ORDERS_PAGE_SIZE = 50;
export const ADMIN_INVENTORY_PAGE_SIZE = 50;
export const ADMIN_CUSTOMERS_PAGE_SIZE = 20;

export async function listAdminProducts(
  page = 1,
  status?: string,
  q?: string,
  options?: { categoryId?: string; uncategorized?: boolean; needsStyling?: boolean },
): Promise<AdminProductList | null> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(ADMIN_CATALOG_PAGE_SIZE),
  });
  if (status) params.set("status", status);
  if (q?.trim()) params.set("q", q.trim());
  if (options?.needsStyling) params.set("needs_styling", "true");
  if (options?.uncategorized) params.set("uncategorized", "true");
  else if (options?.categoryId) params.set("category_id", options.categoryId);
  return adminFetch<AdminProductList>(`/api/v1/admin/catalog/products?${params}`);
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  return adminFetch<AdminProduct>(`/api/v1/admin/catalog/products/${id}`);
}

export async function listAdminCategories(): Promise<AdminCategory[] | null> {
  const data = await adminFetch<{ items: AdminCategory[] }>("/api/v1/admin/catalog/categories");
  return data?.items ?? null;
}

export function formatPrice(cents: number, currency: string = siteConfig.defaultCurrency) {
  const normalized = currency.toUpperCase();
  return new Intl.NumberFormat(siteConfig.locale, {
    style: "currency",
    currency: normalized,
    minimumFractionDigits: 0,
    maximumFractionDigits: normalized === "RUB" ? 0 : 2,
  }).format(cents / 100);
}

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  active: "Активен",
  archived: "Архив",
};
