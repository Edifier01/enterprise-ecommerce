import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminCatalogSearch } from "@/components/admin/catalog/admin-catalog-search";
import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import {
  ADMIN_CATALOG_PAGE_SIZE,
  formatPrice,
  listAdminProducts,
  PRODUCT_STATUS_LABELS,
} from "@/lib/admin/catalog";
import { getCurrentAdmin } from "@/lib/admin/session";
import { siteConfig } from "@/lib/store/site-config";

export const metadata: Metadata = {
  title: "Каталог — Админ-панель",
  robots: { index: false, follow: false },
};

const STATUS_FILTERS = [
  { value: "", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "draft", label: "Черновики" },
  { value: "archived", label: "Архив" },
] as const;

type PageProps = {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
};

function parsePage(raw: string | undefined): number {
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export default async function AdminCatalogPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const { page: pageRaw, status, q } = await searchParams;
  const page = parsePage(pageRaw);
  const searchQuery = q?.trim() ?? "";
  const activeStatus =
    status === "active" || status === "draft" || status === "archived" ? status : undefined;

  const products = await listAdminProducts(page, activeStatus, searchQuery || undefined);
  if (!products) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить товары. Проверьте права доступа.
      </p>
    );
  }

  const totalPages = getAdminTotalPages(products.total, ADMIN_CATALOG_PAGE_SIZE);

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (nextPage > 1) params.set("page", String(nextPage));
    if (activeStatus) params.set("status", activeStatus);
    if (searchQuery) params.set("q", searchQuery);
    const query = params.toString();
    return query ? `/admin/catalog?${query}` : "/admin/catalog";
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

      <AdminCatalogSearch defaultQuery={searchQuery} status={activeStatus} />

      <div className="flex flex-wrap gap-2 text-sm">
        {STATUS_FILTERS.map((filter) => {
          const params = new URLSearchParams();
          if (filter.value) params.set("status", filter.value);
          if (searchQuery) params.set("q", searchQuery);
          const href = params.size > 0 ? `/admin/catalog?${params}` : "/admin/catalog";
          const isActive = (activeStatus ?? "") === filter.value;
          return (
            <Link
              key={filter.label}
              href={href}
              className={
                isActive
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3">Фото</th>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Цена</th>
              <th className="px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {products.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {searchQuery ? "Ничего не найдено." : "Товаров пока нет."}
                </td>
              </tr>
            ) : (
              products.items.map((product) => {
                const imageSrc = product.image_url ?? siteConfig.images.productPlaceholder;
                return (
                  <tr key={product.id} className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
                        <Image
                          src={imageSrc}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized={imageSrc.startsWith("http")}
                        />
                      </div>
                    </td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
