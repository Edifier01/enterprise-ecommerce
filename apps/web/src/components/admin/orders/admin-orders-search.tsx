"use client";

import { AdminSearchBar } from "@/components/admin/admin-search-bar";

type AdminOrdersSearchProps = {
  defaultQuery?: string;
  status?: string;
  exportPending?: boolean;
};

export function AdminOrdersSearch({
  defaultQuery = "",
  status,
  exportPending,
}: AdminOrdersSearchProps) {
  return (
    <AdminSearchBar
      action="/admin/orders"
      label="Поиск по заказам"
      placeholder="Номер заказа или email покупателя"
      defaultQuery={defaultQuery}
      hidden={{
        export_pending: exportPending ? "1" : undefined,
        status: exportPending ? undefined : status,
      }}
    />
  );
}
