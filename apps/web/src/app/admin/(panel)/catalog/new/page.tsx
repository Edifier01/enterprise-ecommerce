import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminProductForm } from "@/components/admin/catalog/admin-product-form";
import { listAdminCategories } from "@/lib/admin/catalog";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Новый товар — Админ-панель",
  robots: { index: false, follow: false },
};

export default async function AdminNewProductPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!admin.permissions.includes("catalog:write")) {
    return <p className="text-sm text-destructive">Недостаточно прав для создания товаров.</p>;
  }

  const categories = (await listAdminCategories()) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="text-sm text-muted-foreground hover:text-foreground">
          ← К каталогу
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Новый товар</h1>
      </div>
      <AdminProductForm categories={categories} mode="create" />
    </div>
  );
}
