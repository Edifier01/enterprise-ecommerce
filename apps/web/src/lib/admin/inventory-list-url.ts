export type AdminInventoryListParams = {
  page?: number;
  lowStockOnly?: boolean;
  q?: string;
};

export function buildAdminInventoryListHref(params: AdminInventoryListParams = {}): string {
  const search = new URLSearchParams();

  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  if (params.lowStockOnly) {
    search.set("low_stock", "true");
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  const query = search.toString();
  return query ? `/admin/inventory?${query}` : "/admin/inventory";
}

export function buildAdminInventoryProductEditHref(
  productId: string,
  listParams: AdminInventoryListParams,
): string {
  const from = buildAdminInventoryListHref(listParams);
  return `/admin/catalog/${productId}/edit?from=${encodeURIComponent(from)}`;
}
