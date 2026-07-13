import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminInventoryTable } from "@/components/admin/inventory/admin-inventory-table";
import { listAdminInventory } from "@/lib/admin/inventory";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Склад — Админ-панель",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ low_stock?: string }>;
};

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const { low_stock } = await searchParams;
  const lowStockOnly = low_stock === "true";
  const inventory = await listAdminInventory(1, lowStockOnly);

  if (!inventory) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить остатки. Проверьте права доступа.
      </p>
    );
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
            href="/admin/inventory"
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
            href="/admin/inventory?low_stock=true"
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

      <AdminInventoryTable
        items={inventory.items}
        lowStockThreshold={inventory.low_stock_threshold}
      />
    </div>
  );
}
