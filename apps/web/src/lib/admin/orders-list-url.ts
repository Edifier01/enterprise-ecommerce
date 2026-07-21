export type AdminOrdersListParams = {
  page?: number;
  status?: string;
  exportPending?: boolean;
  q?: string;
};

export function buildAdminOrdersListHref(params: AdminOrdersListParams = {}): string {
  const search = new URLSearchParams();

  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  if (params.exportPending) {
    search.set("export_pending", "1");
  } else if (params.status) {
    search.set("status", params.status);
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  const query = search.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

export function buildAdminOrderDetailHref(
  orderNumber: string,
  listParams: AdminOrdersListParams,
): string {
  const from = buildAdminOrdersListHref(listParams);
  return `/admin/orders/${encodeURIComponent(orderNumber)}?from=${encodeURIComponent(from)}`;
}

export function parseAdminReturnPath(from: string | undefined, fallback = "/admin/orders"): string {
  if (!from || !from.startsWith("/admin/") || from.includes("//")) {
    return fallback;
  }
  return from;
}

export function getAdminOrdersReturnLabel(href: string): string {
  try {
    const url = new URL(href, "http://local");
    const params = url.searchParams;
    if (params.get("export_pending") === "1") {
      return "← Ожидает экспорта в MS";
    }
    if (params.get("q")) {
      return "← К результатам поиска";
    }
    if (params.get("status") === "confirmed") return "← Подтверждённые";
    if (params.get("status") === "shipped") return "← Отправленные";
    if (params.get("status") === "canceled") return "← Отменённые";
  } catch {
    // fall through
  }
  return "← К списку заказов";
}
