"use client";

import { AdminSearchBar } from "@/components/admin/admin-search-bar";

type AdminCustomersSearchProps = {
  defaultQuery?: string;
  wholesaler?: boolean;
};

export function AdminCustomersSearch({
  defaultQuery = "",
  wholesaler,
}: AdminCustomersSearchProps) {
  return (
    <AdminSearchBar
      action="/admin/customers"
      label="Поиск по клиентам"
      placeholder="Email покупателя"
      defaultQuery={defaultQuery}
      hidden={{
        wholesaler:
          wholesaler === true ? "1" : wholesaler === false ? "0" : undefined,
      }}
    />
  );
}
