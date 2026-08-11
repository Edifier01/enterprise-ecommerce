export type AdminCustomersListParams = {
  page?: number;
  q?: string;
  wholesaler?: boolean;
};

export function buildAdminCustomersListHref(params: AdminCustomersListParams = {}): string {
  const search = new URLSearchParams();

  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  if (params.wholesaler === true) {
    search.set("wholesaler", "1");
  } else if (params.wholesaler === false) {
    search.set("wholesaler", "0");
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  const query = search.toString();
  return query ? `/admin/customers?${query}` : "/admin/customers";
}

export function parseAdminCustomersWholesalerFilter(
  raw: string | undefined,
): boolean | undefined {
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return undefined;
}
