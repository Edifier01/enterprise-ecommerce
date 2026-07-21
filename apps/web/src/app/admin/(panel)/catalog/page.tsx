import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminCatalogCategoryPicker } from "@/components/admin/catalog/admin-catalog-category-picker";
import { AdminCatalogSearch } from "@/components/admin/catalog/admin-catalog-search";
import { AdminProductHideButton } from "@/components/admin/catalog/admin-product-hide-button";
import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import {
  AdminDesktopTable,
  AdminMobileCard,
  AdminMobileCardList,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import {
  ADMIN_CATALOG_PAGE_SIZE,
  formatPrice,
  listAdminCategories,
  listAdminProducts,
  PRODUCT_STATUS_LABELS,
  type AdminCategory,
} from "@/lib/admin/catalog";
import { isMoySkladSynced } from "@/lib/admin/moysklad";
import { MoySkladBadge } from "@/components/admin/moysklad/moysklad-badge";
import { getCurrentAdmin } from "@/lib/admin/session";
import {
  buildAdminCatalogEditHref,
  buildAdminCatalogListHref,
  buildCategoryNameMap,
  getProductCategoryName,
  type AdminCatalogListParams,
} from "@/lib/admin/catalog-list-url";
import { productImageRenderProps } from "@/lib/store/product-image";

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
  searchParams: Promise<{
    page?: string;
    status?: string;
    q?: string;
    category_id?: string;
    uncategorized?: string;
    all?: string;
    needs_styling?: string;
    needs_color_photos?: string;
    view?: string;
  }>;
};

function parsePage(raw: string | undefined): number {
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

function getCategoryLabel(
  categories: AdminCategory[] | null,
  categoryId: string | undefined,
  uncategorized: boolean,
  showAll: boolean,
): string {
  if (uncategorized) return "Без категории";
  if (showAll) return "Все товары";
  if (!categoryId || !categories) return "Каталог";
  return categories.find((category) => category.id === categoryId)?.name ?? "Каталог";
}

export default async function AdminCatalogPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  const canWrite = admin.permissions.includes("catalog:write");

  const params = await searchParams;
  const hasListFilter = Boolean(
    params.q?.trim() ||
      params.all ||
      params.uncategorized ||
      params.needs_styling ||
      params.needs_color_photos ||
      params.category_id ||
      params.status ||
      params.page,
  );
  if (!hasListFilter && params.view !== "categories") {
    redirect("/admin/catalog?all=1");
  }

  const { page: pageRaw, status, q, category_id, uncategorized, all, needs_styling, needs_color_photos, view } =
    params;
  const page = parsePage(pageRaw);
  const searchQuery = q?.trim() ?? "";
  const activeStatus =
    status === "active" || status === "draft" || status === "archived" ? status : undefined;
  const isUncategorized = uncategorized === "1" || uncategorized === "true";
  const showAll = all === "1" || all === "true";
  const needsStyling = needs_styling === "1" || needs_styling === "true";
  const needsColorPhotos = needs_color_photos === "1" || needs_color_photos === "true";
  const viewCategories = view === "categories";
  const showProductList =
    !viewCategories &&
    (Boolean(searchQuery) ||
      showAll ||
      isUncategorized ||
      needsStyling ||
      needsColorPhotos ||
      Boolean(category_id));

  const [categoriesResult, allProductsResult] = await Promise.all([
    listAdminCategories(),
    listAdminProducts(1),
  ]);
  const categories = categoriesResult.ok ? categoriesResult.data : null;
  const totalProductCount = allProductsResult.ok ? allProductsResult.data.total : 0;

  if (!showProductList) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Каталог</h1>
            <p className="text-sm text-muted-foreground">
              Товары импортируются из МойСклад. Создайте категории и назначьте их в{" "}
              <Link href="/admin/integrations/moysklad/import" className="text-foreground underline">
                очереди импорта
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/integrations/moysklad/import"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Очередь импорта
            </Link>
            <Link
              href="/admin/catalog/categories"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
            >
              Категории
            </Link>
          </div>
        </div>

        {categoriesResult.ok ? (
          <AdminCatalogCategoryPicker
            categories={categoriesResult.data}
            totalProductCount={totalProductCount}
            canWrite={canWrite}
          />
        ) : (
          <p className="text-sm text-destructive" role="alert">
            {categoriesResult.error}
          </p>
        )}
      </div>
    );
  }

  const productsResult = await listAdminProducts(page, activeStatus, searchQuery || undefined, {
    categoryId: category_id,
    uncategorized: isUncategorized,
    needsStyling,
    needsColorPhotos,
  });

  if (!productsResult.ok) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {productsResult.error}
      </p>
    );
  }

  const products = productsResult.data;

  const totalPages = getAdminTotalPages(products.total, ADMIN_CATALOG_PAGE_SIZE);
  const categoryLabel = getCategoryLabel(categories, category_id, isUncategorized, showAll);
  const listParams: AdminCatalogListParams = {
    page,
    status: activeStatus,
    q: searchQuery || undefined,
    categoryId: category_id,
    uncategorized: isUncategorized,
    showAll,
    needsStyling,
    needsColorPhotos,
  };
  const categoryNames = buildCategoryNameMap(categories);

  function buildHref(nextPage: number) {
    return buildAdminCatalogListHref({ ...listParams, page: nextPage });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/catalog?view=categories"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← К категориям
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{categoryLabel}</h1>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? `Результаты поиска (${products.total})`
              : `${products.total} товаров`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/integrations/moysklad/import"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Очередь импорта
          </Link>
          <Link
            href="/admin/catalog/categories"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Категории
          </Link>
        </div>
      </div>

      <AdminCatalogSearch
        defaultQuery={searchQuery}
        status={activeStatus}
        categoryId={category_id}
        uncategorized={isUncategorized}
        showAll={showAll}
        needsStyling={needsStyling}
        needsColorPhotos={needsColorPhotos}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={buildAdminCatalogListHref({
            showAll: true,
            needsStyling: true,
            q: searchQuery || undefined,
          })}
          className={
            needsStyling
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }
        >
          Требует оформления
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link
          href={buildAdminCatalogListHref({
            showAll: true,
            needsColorPhotos: true,
            q: searchQuery || undefined,
          })}
          className={
            needsColorPhotos
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }
        >
          Фото по цветам
        </Link>
        <span className="text-muted-foreground">·</span>
        {STATUS_FILTERS.map((filter) => {
          const href = buildAdminCatalogListHref({
            ...listParams,
            page: undefined,
            status: filter.value || undefined,
          });
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

      {products.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {searchQuery
            ? "Ничего не найдено."
            : "Нет товаров из МойСклад. Запустите импорт на странице интеграции."}
        </p>
      ) : (
        <>
          <AdminMobileCardList>
            {products.items.map((product) => {
              const image = productImageRenderProps(product.image_url);
              return (
                <AdminMobileCard key={product.id}>
                  <div className="flex gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                      <Image
                        src={image.src}
                        alt={product.name}
                        fill
                        className="object-cover"
                        unoptimized={image.unoptimized}
                        placeholder={image.placeholder}
                        blurDataURL={image.blurDataURL}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="font-medium leading-snug">{product.name}</p>
                      {isMoySkladSynced(product.sync_source) ? (
                        <MoySkladBadge />
                      ) : null}
                      <AdminMobileCardRow label="Slug">
                        <span className="break-all font-normal text-muted-foreground">
                          {product.slug}
                        </span>
                      </AdminMobileCardRow>
                      <AdminMobileCardRow label="Статус">
                        {PRODUCT_STATUS_LABELS[product.status] ?? product.status}
                      </AdminMobileCardRow>
                      <AdminMobileCardRow label="Категория">
                        {getProductCategoryName(product.category_id, categoryNames)}
                      </AdminMobileCardRow>
                      <AdminMobileCardRow label="Цена">
                        {formatPrice(product.price_cents, product.currency)}
                      </AdminMobileCardRow>
                      {canWrite ? (
                        <>
                          <Link
                            href={buildAdminCatalogEditHref(product.id, listParams)}
                            className="inline-flex text-sm font-medium text-primary hover:underline"
                          >
                            Изменить
                          </Link>
                          <AdminProductHideButton
                            productId={product.id}
                            hidden={product.status === "archived"}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                </AdminMobileCard>
              );
            })}
          </AdminMobileCardList>

          <AdminDesktopTable className="rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3">Фото</th>
                  <th className="px-4 py-3">Название</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Категория</th>
                  <th className="px-4 py-3">Цена</th>
                  {canWrite ? <th className="px-4 py-3">Действия</th> : null}
                </tr>
              </thead>
              <tbody>
                {products.items.map((product) => {
                  const image = productImageRenderProps(product.image_url);
                  return (
                    <tr key={product.id} className="border-b border-border/60">
                      <td className="px-4 py-3">
                        <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
                          <Image
                            src={image.src}
                            alt={product.name}
                            fill
                            className="object-cover"
                            unoptimized={image.unoptimized}
                            placeholder={image.placeholder}
                            blurDataURL={image.blurDataURL}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          {product.name}
                          {isMoySkladSynced(product.sync_source) ? <MoySkladBadge /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{product.slug}</td>
                      <td className="px-4 py-3">
                        {PRODUCT_STATUS_LABELS[product.status] ?? product.status}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getProductCategoryName(product.category_id, categoryNames)}
                      </td>
                      <td className="px-4 py-3">
                        {formatPrice(product.price_cents, product.currency)}
                      </td>
                      {canWrite ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              href={buildAdminCatalogEditHref(product.id, listParams)}
                              className="text-primary hover:underline"
                            >
                              Изменить
                            </Link>
                            <AdminProductHideButton
                              productId={product.id}
                              hidden={product.status === "archived"}
                            />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminDesktopTable>
        </>
      )}

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
