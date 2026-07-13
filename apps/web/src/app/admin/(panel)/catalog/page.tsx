import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  formatPrice,
  listAdminProducts,
  PRODUCT_STATUS_LABELS,
} from "@/lib/admin/catalog";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Каталог — Админ-панель",
  robots: { index: false, follow: false },
};

export default async function AdminCatalogPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const products = await listAdminProducts();
  if (!products) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить товары. Проверьте права доступа.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Каталог</h1>
          <p className="text-sm text-muted-foreground">
            Управление товарами магазина ({products.total} всего).
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/catalog/categories"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Категории
          </Link>
          <Link
            href="/admin/catalog/new"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Новый товар
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Цена</th>
              <th className="px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {products.items.map((product) => (
              <tr key={product.id} className="border-b border-border/60">
                <td className="px-4 py-3 font-medium">{product.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{product.slug}</td>
                <td className="px-4 py-3">
                  {PRODUCT_STATUS_LABELS[product.status] ?? product.status}
                </td>
                <td className="px-4 py-3">
                  {formatPrice(product.price_cents, product.currency)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/catalog/${product.id}/edit`}
                    className="text-primary hover:underline"
                  >
                    Изменить
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
