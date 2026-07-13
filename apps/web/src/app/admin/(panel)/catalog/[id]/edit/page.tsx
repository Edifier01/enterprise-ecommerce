import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminProductEditForm } from "@/components/admin/catalog/admin-product-edit-form";
import { getAdminProduct, listAdminCategories } from "@/lib/admin/catalog";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Редактирование товара — Админ-панель",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditProductPage({ params }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!admin.permissions.includes("catalog:write")) {
    return <p className="text-sm text-destructive">Недостаточно прав для редактирования товаров.</p>;
  }

  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    listAdminCategories(),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="text-sm text-muted-foreground hover:text-foreground">
          ← К каталогу
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Редактирование товара</h1>
      </div>
      <AdminProductEditForm product={product} categories={categories ?? []} />
    </div>
  );
}
