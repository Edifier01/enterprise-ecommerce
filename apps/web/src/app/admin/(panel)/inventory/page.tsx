import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminFilterChips } from "@/components/admin/admin-filter-chips";
import { AdminFetchErrorState, AdminForbiddenState } from "@/components/admin/admin-error-state";
import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import { AdminSavedViews } from "@/components/admin/admin-saved-views";
import { AdminInventorySearch } from "@/components/admin/inventory/admin-inventory-search";
import { AdminInventoryStockSync } from "@/components/admin/inventory/admin-inventory-stock-sync";
import { AdminInventoryTable } from "@/components/admin/inventory/admin-inventory-table";
import { ADMIN_INVENTORY_PAGE_SIZE } from "@/lib/admin/catalog";
import { buildAdminInventoryListHref } from "@/lib/admin/inventory-list-url";
import { listAdminInventory } from "@/lib/admin/inventory";
import {
  adminHasPermission,
} from "@/lib/admin/require-admin-permission";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Склад — Админ-панель",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ page?: string; low_stock?: string; q?: string; group_by?: string }>;
};

function parsePage(raw: string | undefined): number {
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!adminHasPermission(admin, "admin:read")) {
    return <AdminForbiddenState />;
  }

  const { page: pageRaw, low_stock, q, group_by } = await searchParams;
  const page = parsePage(pageRaw);
  const lowStockOnly = low_stock === "true";
  const query = q?.trim() ?? "";
  const groupBy: "variant" | "product" = group_by === "product" ? "product" : "variant";
  const inventoryResult = await listAdminInventory(page, lowStockOnly, query || undefined, groupBy);

  if (!inventoryResult.ok) {
    return <AdminFetchErrorState message={inventoryResult.error} retryHref="/admin/inventory" />;
  }

  const inventory = inventoryResult.data;
  const canSyncStock = admin.permissions.includes("integrations:write");
  const listParams = { page, lowStockOnly, q: query || undefined, groupBy };

  const totalPages = getAdminTotalPages(inventory.total, ADMIN_INVENTORY_PAGE_SIZE);

  function buildHref(nextPage: number) {
    return buildAdminInventoryListHref({ ...listParams, page: nextPage });
  }

  const baseListParams = { q: query || undefined };
  const activeView = lowStockOnly ? "low_stock" : groupBy === "product" ? "by_product" : "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Склад</h1>
          <p className="text-sm text-muted-foreground">
            {groupBy === "product"
              ? `Товары на складе (${inventory.total})`
              : `Остатки по вариантам (${inventory.total} позиций).`}
          </p>
        </div>
        <AdminInventoryStockSync canSync={canSyncStock} />
      </div>

      <AdminSavedViews
        activeId={activeView}
        views={[
          {
            id: "all",
            label: "Все варианты",
            href: buildAdminInventoryListHref(baseListParams),
          },
          {
            id: "low_stock",
            label: "Низкий остаток",
            href: buildAdminInventoryListHref({ ...baseListParams, lowStockOnly: true }),
          },
          {
            id: "by_product",
            label: "По товарам",
            href: buildAdminInventoryListHref({ ...baseListParams, groupBy: "product" }),
          },
        ]}
      />

      <AdminFilterChips
        items={[
          {
            label: "Все",
            href: buildAdminInventoryListHref({ ...listParams, lowStockOnly: false, groupBy }),
            active: !lowStockOnly,
          },
          {
            label: "Низкий остаток",
            href: buildAdminInventoryListHref({ ...listParams, lowStockOnly: true }),
            active: lowStockOnly,
          },
          {
            label: "По вариантам",
            href: buildAdminInventoryListHref({ ...listParams, groupBy: "variant" }),
            active: groupBy === "variant",
          },
          {
            label: "По товарам",
            href: buildAdminInventoryListHref({ ...listParams, groupBy: "product" }),
            active: groupBy === "product",
          },
        ]}
        resetHref={buildAdminInventoryListHref()}
      />

      <AdminInventorySearch
        defaultQuery={query}
        lowStockOnly={lowStockOnly}
        groupBy={groupBy}
      />

      <AdminInventoryTable
        items={inventory.items}
        groups={inventory.groups}
        groupBy={inventory.group_by}
        lowStockThreshold={inventory.low_stock_threshold}
        listParams={listParams}
      />

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
