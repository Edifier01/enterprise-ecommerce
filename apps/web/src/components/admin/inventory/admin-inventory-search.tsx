"use client";

import { AdminSearchBar } from "@/components/admin/admin-search-bar";

type AdminInventorySearchProps = {
  defaultQuery?: string;
  lowStockOnly?: boolean;
  groupBy?: "variant" | "product";
};

export function AdminInventorySearch({
  defaultQuery = "",
  lowStockOnly = false,
  groupBy = "variant",
}: AdminInventorySearchProps) {
  return (
    <AdminSearchBar
      action="/admin/inventory"
      label="Поиск по складу"
      placeholder="SKU или название товара"
      defaultQuery={defaultQuery}
      hidden={{
        low_stock: lowStockOnly ? "true" : undefined,
        group_by: groupBy === "product" ? "product" : undefined,
      }}
    />
  );
}
