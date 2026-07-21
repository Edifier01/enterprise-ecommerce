import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import { AdminInventorySearch } from "@/components/admin/inventory/admin-inventory-search";
import { AdminInventoryStockSync } from "@/components/admin/inventory/admin-inventory-stock-sync";
import { AdminInventoryTable } from "@/components/admin/inventory/admin-inventory-table";
import { ADMIN_INVENTORY_PAGE_SIZE } from "@/lib/admin/catalog";
import { buildAdminInventoryListHref } from "@/lib/admin/inventory-list-url";
import { listAdminInventory } from "@/lib/admin/inventory";
import {
  ADMIN_PAGE_FORBIDDEN_MESSAGE,
  adminHasPermission,
} from "@/lib/admin/require-admin-permission";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Склад — Админ-панель",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ page?: string; low_stock?: string; q?: string }>;
};

function parsePage(raw: string | undefined): number {
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!adminHasPermission(admin, "admin:read")) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {ADMIN_PAGE_FORBIDDEN_MESSAGE}
      </p>
    );
  }

  const { page: pageRaw, low_stock, q } = await searchParams;
  const page = parsePage(pageRaw);
  const lowStockOnly = low_stock === "true";
  const query = q?.trim() ?? "";
  const inventoryResult = await listAdminInventory(page, lowStockOnly, query || undefined);

  if (!inventoryResult.ok) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {inventoryResult.error}
      </p>
    );
  }

  const inventory = inventoryResult.data;
  const canSyncStock = admin.permissions.includes("integrations:write");
  const listParams = { page, lowStockOnly, q: query || undefined };

  const totalPages = getAdminTotalPages(inventory.total, ADMIN_INVENTORY_PAGE_SIZE);

  function buildHref(nextPage: number) {
    return buildAdminInventoryListHref({ ...listParams, page: nextPage });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Склад</h1>
          <p className="text-sm text-muted-foreground">
            Остатки по вариантам ({inventory.total} позиций).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2 text-sm">
          <Link
            href={query ? `/admin/inventory?q=${encodeURIComponent(query)}` : "/admin/inventory"}
            className={
              lowStockOnly
                ? "text-muted-foreground hover:text-foreground"
                : "font-medium text-foreground"
            }
          >
            Все
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href={
              query
                ? `/admin/inventory?low_stock=true&q=${encodeURIComponent(query)}`
                : "/admin/inventory?low_stock=true"
            }
            className={
              lowStockOnly
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            Низкий остаток
          </Link>
          </div>
          <AdminInventoryStockSync canSync={canSyncStock} />
        </div>
      </div>

      <AdminInventorySearch defaultQuery={query} lowStockOnly={lowStockOnly} />

      <AdminInventoryTable
        items={inventory.items}
        lowStockThreshold={inventory.low_stock_threshold}
        listParams={listParams}
      />

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
