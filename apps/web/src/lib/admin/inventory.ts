import "server-only";

import { adminFetchResult, type AdminFetchResult } from "@/lib/admin/admin-fetch";
import { ADMIN_INVENTORY_PAGE_SIZE } from "@/lib/admin/catalog";
import type { AdminInventoryList } from "@/lib/admin/inventory-shared";

export type { AdminInventoryItem, AdminInventoryList };
export { INVENTORY_REASONS } from "@/lib/admin/inventory-shared";

export async function listAdminInventory(
  page = 1,
  lowStock = false,
  query?: string,
): Promise<AdminFetchResult<AdminInventoryList>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(ADMIN_INVENTORY_PAGE_SIZE),
  });
  if (lowStock) params.set("low_stock", "true");
  if (query) params.set("q", query);
  return adminFetchResult<AdminInventoryList>(`/api/v1/admin/inventory?${params}`);
}
