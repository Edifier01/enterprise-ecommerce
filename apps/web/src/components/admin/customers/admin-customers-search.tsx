"use client";

import { AdminSearchBar } from "@/components/admin/admin-search-bar";

type AdminCustomersSearchProps = {
  defaultQuery?: string;
};

export function AdminCustomersSearch({ defaultQuery = "" }: AdminCustomersSearchProps) {
  return (
    <AdminSearchBar
      action="/admin/customers"
      label="Поиск по клиентам"
      placeholder="Email покупателя"
      defaultQuery={defaultQuery}
    />
  );
}
