import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import { AdminInventorySearch } from "@/components/admin/inventory/admin-inventory-search";
import { AdminInventoryTable } from "@/components/admin/inventory/admin-inventory-table";
import { ADMIN_INVENTORY_PAGE_SIZE } from "@/lib/admin/catalog";
import { listAdminInventory } from "@/lib/admin/inventory";
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

  const totalPages = getAdminTotalPages(inventory.total, ADMIN_INVENTORY_PAGE_SIZE);

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (nextPage > 1) params.set("page", String(nextPage));
    if (lowStockOnly) params.set("low_stock", "true");
    if (query) params.set("q", query);
    const queryString = params.toString();
    return queryString ? `/admin/inventory?${queryString}` : "/admin/inventory";
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
      </div>

      <AdminInventorySearch defaultQuery={query} lowStockOnly={lowStockOnly} />

      <AdminInventoryTable items={inventory.items} lowStockThreshold={inventory.low_stock_threshold} />

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
