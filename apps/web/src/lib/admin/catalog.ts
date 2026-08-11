import "server-only";

import { adminFetch, adminFetchResult, type AdminFetchResult } from "@/lib/admin/admin-fetch";
import { parseAdminCatalogListParams } from "@/lib/admin/catalog-list-url";

import {
  ADMIN_CATALOG_PAGE_SIZE,
  ADMIN_CUSTOMERS_PAGE_SIZE,
  ADMIN_INVENTORY_PAGE_SIZE,
  ADMIN_ORDERS_PAGE_SIZE,
  type AdminCatalogOverview,
  type AdminCategory,
  type AdminProduct,
  type AdminProductList,
} from "@/lib/admin/catalog-shared";

export type {
  AdminCategory,
  AdminCatalogOverview,
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
  getAdminProductListPrices,
  PRODUCT_STATUS_LABELS,
} from "@/lib/admin/catalog-shared";

export async function listAdminProducts(
  page = 1,
  status?: string,
  q?: string,
  options?: {
    categoryId?: string;
    uncategorized?: boolean;
    needsStyling?: boolean;
    needsColorPhotos?: boolean;
    moyskladPending?: boolean;
    syncSource?: string;
  },
): Promise<AdminFetchResult<AdminProductList>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(ADMIN_CATALOG_PAGE_SIZE),
  });
  if (status) params.set("status", status);
  if (q?.trim()) params.set("q", q.trim());
  if (options?.needsStyling) params.set("needs_styling", "true");
  if (options?.needsColorPhotos) params.set("needs_color_photos", "true");
  if (options?.moyskladPending) params.set("moysklad_pending", "true");
  if (options?.uncategorized) params.set("uncategorized", "true");
  else if (options?.categoryId) params.set("category_id", options.categoryId);
  params.set("sync_source", options?.syncSource ?? "moysklad");
  return adminFetchResult<AdminProductList>(`/api/v1/admin/catalog/products?${params}`);
}

export async function getAdminCatalogOverview(): Promise<AdminFetchResult<AdminCatalogOverview>> {
  return adminFetchResult<AdminCatalogOverview>("/api/v1/admin/catalog/overview");
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  return adminFetch<AdminProduct>(`/api/v1/admin/catalog/products/${id}`);
}

function findNextProductIdInList(
  items: AdminProduct[],
  currentProductId: string,
): string | null {
  const index = items.findIndex((item) => item.id === currentProductId);
  if (index < 0 || index >= items.length - 1) {
    return null;
  }
  return items[index + 1]?.id ?? null;
}

export async function resolveAdminNextProductId(
  currentProductId: string,
  returnPath: string,
): Promise<string | null> {
  const params = parseAdminCatalogListParams(returnPath);
  const page = params.page ?? 1;

  const listOptions = params.moyskladPending
    ? { moyskladPending: true as const }
    : {
        categoryId: params.categoryId,
        uncategorized: params.uncategorized,
        needsStyling: params.needsStyling,
        needsColorPhotos: params.needsColorPhotos,
      };

  const result = await listAdminProducts(
    page,
    params.status,
    params.q,
    listOptions,
  );
  if (!result.ok) {
    return null;
  }

  const nextOnPage = findNextProductIdInList(result.data.items, currentProductId);
  if (nextOnPage) {
    return nextOnPage;
  }

  const hasMore = result.data.page * result.data.limit < result.data.total;
  if (!hasMore) {
    return null;
  }

  const nextPage = await listAdminProducts(
    page + 1,
    params.status,
    params.q,
    listOptions,
  );
  if (!nextPage.ok || nextPage.data.items.length === 0) {
    return null;
  }
  return nextPage.data.items[0]?.id ?? null;
}

export async function listAdminCategories(): Promise<AdminFetchResult<AdminCategory[]>> {
  const result = await adminFetchResult<{ items: AdminCategory[] }>(
    "/api/v1/admin/catalog/categories",
  );
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: result.data.items };
}
