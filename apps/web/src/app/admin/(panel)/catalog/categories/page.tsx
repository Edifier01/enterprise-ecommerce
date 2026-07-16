import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminCategoryPanel } from "@/components/admin/catalog/admin-category-panel";
import { listAdminCategories } from "@/lib/admin/catalog";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Категории — Админ-панель",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const categories = await listAdminCategories();
  if (!categories) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить категории.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="text-sm text-muted-foreground hover:text-foreground">
          ← К каталогу
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Категории</h1>
        <p className="text-sm text-muted-foreground">
          Создание корневых категорий и подкатегорий (не более 2 уровней). Активные категории
          сразу появляются на сайте.
        </p>
      </div>
      <AdminCategoryPanel categories={categories} />
    </div>
  );
}
