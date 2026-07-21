import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminProductEditForm } from "@/components/admin/catalog/admin-product-edit-form";
import { getAdminProduct, listAdminCategories } from "@/lib/admin/catalog";
import { getAdminReturnLabel, parseAdminReturnPath } from "@/lib/admin/catalog-list-url";
import {
  ADMIN_PAGE_FORBIDDEN_MESSAGE,
  adminHasPermission,
} from "@/lib/admin/require-admin-permission";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Редактирование товара — Админ-панель",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function AdminEditProductPage({ params, searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!adminHasPermission(admin, "catalog:write")) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {ADMIN_PAGE_FORBIDDEN_MESSAGE}
      </p>
    );
  }

  const { id } = await params;
  const { from } = await searchParams;
  const [product, categoriesResult] = await Promise.all([
    getAdminProduct(id),
    listAdminCategories(),
  ]);

  if (!product) notFound();

  const returnTo = parseAdminReturnPath(from);
  const backLabel = getAdminReturnLabel(returnTo);

  return (
    <div className="space-y-6">
      <div>
        <Link href={returnTo} className="text-sm text-muted-foreground hover:text-foreground">
          {backLabel}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Редактирование товара</h1>
      </div>
      {categoriesResult.ok ? null : (
        <p className="text-sm text-amber-700" role="status">
          {categoriesResult.error}
        </p>
      )}
      <AdminProductEditForm
        product={product}
        categories={categoriesResult.ok ? categoriesResult.data : []}
        returnTo={returnTo}
      />
    </div>
  );
}
