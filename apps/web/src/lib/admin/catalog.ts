import "server-only";

import { getAdminAccessToken } from "@/lib/admin/session";

import { getApiBase } from "@/lib/api-base";

import {
  ADMIN_CATALOG_PAGE_SIZE,
  ADMIN_CUSTOMERS_PAGE_SIZE,
  ADMIN_INVENTORY_PAGE_SIZE,
  ADMIN_ORDERS_PAGE_SIZE,
  type AdminCategory,
  type AdminProduct,
  type AdminProductList,
} from "@/lib/admin/catalog-shared";

export type {
  AdminCategory,
  AdminProduct,
  AdminProductList,
  ProductImage,
} from "@/lib/admin/catalog-shared";

export {
  ADMIN_CATALOG_PAGE_SIZE,
  ADMIN_CUSTOMERS_PAGE_SIZE,
  ADMIN_INVENTORY_PAGE_SIZE,
  ADMIN_ORDERS_PAGE_SIZE,
  formatPrice,
  PRODUCT_STATUS_LABELS,
} from "@/lib/admin/catalog-shared";

const API_BASE = getApiBase();

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

export async function listAdminProducts(
  page = 1,
  status?: string,
  q?: string,
  options?: {
    categoryId?: string;
    uncategorized?: boolean;
    needsStyling?: boolean;
    moyskladPending?: boolean;
    syncSource?: string;
  },
): Promise<AdminProductList | null> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(ADMIN_CATALOG_PAGE_SIZE),
  });
  if (status) params.set("status", status);
  if (q?.trim()) params.set("q", q.trim());
  if (options?.needsStyling) params.set("needs_styling", "true");
  if (options?.moyskladPending) params.set("moysklad_pending", "true");
  if (options?.uncategorized) params.set("uncategorized", "true");
  else if (options?.categoryId) params.set("category_id", options.categoryId);
  params.set("sync_source", options?.syncSource ?? "moysklad");
  return adminFetch<AdminProductList>(`/api/v1/admin/catalog/products?${params}`);
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  return adminFetch<AdminProduct>(`/api/v1/admin/catalog/products/${id}`);
}

export async function listAdminCategories(): Promise<AdminCategory[] | null> {
  const data = await adminFetch<{ items: AdminCategory[] }>("/api/v1/admin/catalog/categories");
  return data?.items ?? null;
}
