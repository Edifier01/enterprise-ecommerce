import type { Metadata } from "next";

import Link from "next/link";

import { redirect } from "next/navigation";



import { AdminFilterChips } from "@/components/admin/admin-filter-chips";

import { AdminFetchErrorState } from "@/components/admin/admin-error-state";

import { AdminSavedViews } from "@/components/admin/admin-saved-views";

import { AdminCatalogCategoryPicker } from "@/components/admin/catalog/admin-catalog-category-picker";

import { AdminCatalogSearch } from "@/components/admin/catalog/admin-catalog-search";

import { AdminCatalogTable } from "@/components/admin/catalog/admin-catalog-table";

import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";

import {

  ADMIN_CATALOG_PAGE_SIZE,

  getAdminCatalogOverview,

  listAdminCategories,

  listAdminProducts,

  type AdminCategory,

} from "@/lib/admin/catalog";

import { getCurrentAdmin } from "@/lib/admin/session";

import {

  buildAdminCatalogListHref,

  buildCategoryNameMap,

  type AdminCatalogListParams,

} from "@/lib/admin/catalog-list-url";



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



  const [categoriesResult, overviewResult] = await Promise.all([

    listAdminCategories(),

    getAdminCatalogOverview(),

  ]);

  const categories = categoriesResult.ok ? categoriesResult.data : null;

  const totalProductCount = overviewResult.ok ? overviewResult.data.total : 0;



  if (!showProductList) {

    return (

      <div className="space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>

            <h1 className="text-2xl font-semibold tracking-tight">Каталог</h1>

            <p className="text-sm text-muted-foreground">

              Товары импортируются из МойСклад. Назначьте категории в{" "}

              <Link href="/admin/integrations/moysklad/import" className="text-foreground underline">

                очереди импорта

              </Link>{" "}

              или на странице{" "}

              <Link href="/admin/catalog/workflow" className="text-foreground underline">

                оформления

              </Link>

              .

            </p>

          </div>

        </div>



        {categoriesResult.ok ? (

          <AdminCatalogCategoryPicker

            categories={categoriesResult.data}

            totalProductCount={totalProductCount}

            canWrite={canWrite}

          />

        ) : (

          <AdminFetchErrorState

            message={categoriesResult.error}

            retryHref="/admin/catalog?view=categories"

          />

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

      <AdminFetchErrorState message={productsResult.error} retryHref="/admin/catalog?all=1" />

    );

  }



  const products = productsResult.data;

  const overview = overviewResult.ok ? overviewResult.data : null;



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

        <Link

          href="/admin/catalog/workflow"

          className="text-sm font-medium text-primary hover:underline"

        >

          Оформление товаров

        </Link>

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



      <AdminSavedViews

        activeId={

          needsStyling

            ? "needs_styling"

            : needsColorPhotos

              ? "needs_color_photos"

              : isUncategorized

                ? "uncategorized"

                : activeStatus || "all"

        }

        views={[

          {

            id: "all",

            label: "Все",

            href: buildAdminCatalogListHref({ showAll: true, q: searchQuery || undefined }),

            count: overview?.total,

          },

          {

            id: "needs_styling",

            label: "Требует оформления",

            href: buildAdminCatalogListHref({

              showAll: true,

              needsStyling: true,

              q: searchQuery || undefined,

            }),

            count: overview?.needs_styling,

          },

          {

            id: "needs_color_photos",

            label: "Фото по цветам",

            href: buildAdminCatalogListHref({

              showAll: true,

              needsColorPhotos: true,

              q: searchQuery || undefined,

            }),

            count: overview?.needs_color_photos,

          },

          {

            id: "uncategorized",

            label: "Без категории",

            href: buildAdminCatalogListHref({ uncategorized: true, q: searchQuery || undefined }),

            count: overview?.uncategorized,

          },

          {

            id: "draft",

            label: "Черновики",

            href: buildAdminCatalogListHref({

              showAll: true,

              status: "draft",

              q: searchQuery || undefined,

            }),

            count: overview?.draft,

          },

        ]}

      />



      <AdminFilterChips

        items={[

          {

            label: "Требует оформления",

            href: buildAdminCatalogListHref({

              showAll: true,

              needsStyling: true,

              q: searchQuery || undefined,

            }),

            active: needsStyling,

          },

          {

            label: "Фото по цветам",

            href: buildAdminCatalogListHref({

              showAll: true,

              needsColorPhotos: true,

              q: searchQuery || undefined,

            }),

            active: needsColorPhotos,

          },

          ...STATUS_FILTERS.map((filter) => {

            const href = buildAdminCatalogListHref({

              ...listParams,

              page: undefined,

              status: filter.value || undefined,

              needsStyling: undefined,

              needsColorPhotos: undefined,

            });

            return {

              label: filter.label,

              href,

              active: !needsStyling && !needsColorPhotos && (activeStatus ?? "") === filter.value,

            };

          }),

        ]}

        resetHref={buildAdminCatalogListHref({

          showAll: true,

          q: searchQuery || undefined,

        })}

      />



      <AdminCatalogTable

        products={products.items}

        canWrite={canWrite}

        listParams={listParams}

        categoryNames={categoryNames}

        searchQuery={searchQuery}

      />



      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />

    </div>

  );

}

