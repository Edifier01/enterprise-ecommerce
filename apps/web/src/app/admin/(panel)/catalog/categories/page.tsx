import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminCategoryPanel } from "@/components/admin/catalog/admin-category-panel";
import { listAdminCategories } from "@/lib/admin/catalog";
import {
  ADMIN_PAGE_FORBIDDEN_MESSAGE,
  adminHasPermission,
} from "@/lib/admin/require-admin-permission";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Категории — Админ-панель",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!adminHasPermission(admin, "catalog:write")) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {ADMIN_PAGE_FORBIDDEN_MESSAGE}
      </p>
    );
  }

  const categoriesResult = await listAdminCategories();
  if (!categoriesResult.ok) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {categoriesResult.error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog?all=1" className="text-sm text-muted-foreground hover:text-foreground">
          ← К каталогу
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Категории</h1>
        <p className="text-sm text-muted-foreground">
          Структура витрины: корневые категории и подкатегории. Товары добавляются только через
          МойСклад.
        </p>
      </div>
      <AdminCategoryPanel
        categories={categoriesResult.data}
        canWrite={admin.permissions.includes("catalog:write")}
      />
    </div>
  );
}
