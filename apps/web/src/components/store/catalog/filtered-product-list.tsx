"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import {
  CatalogPagination,
  CATALOG_PAGE_SIZE,
  getTotalPages,
} from "@/components/store/catalog/catalog-pagination";
import { CatalogFiltersPanel } from "@/components/store/catalog/catalog-filters-panel";
import { ProductGrid, type ProductGridItem } from "@/components/store/catalog/product-grid";
import {
  SortToolbar,
  type SortOptionValue,
} from "@/components/store/catalog/sort-toolbar";
import {
  countActiveFilters,
  type CatalogFilterFacets,
  type CatalogFilterState,
} from "@/lib/store/catalog-filters";
import {
  buildCatalogSearchParams,
  type CatalogListQuery,
} from "@/lib/store/catalog-query";

export interface FilteredProductListProps {
  products: ProductGridItem[];
  total: number;
  facets: CatalogFilterFacets;
  query: CatalogListQuery;
  searchQuery?: string;
  emptyMessage?: string;
  pageSize?: number;
}

export function FilteredProductList({
  products,
  total,
  facets,
  query,
  searchQuery,
  emptyMessage = "В этом разделе пока нет товаров.",
  pageSize = CATALOG_PAGE_SIZE,
}: FilteredProductListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filters: CatalogFilterState = {
    inStockOnly: query.inStockOnly,
    onSaleOnly: query.onSaleOnly,
    sizes: query.sizes,
    colors: query.colors,
    priceMin: query.priceMin,
    priceMax: query.priceMax,
  };

  const activeFilterCount = countActiveFilters(filters);
  const totalPages = getTotalPages(total, pageSize);

  const navigateWithQuery = useCallback(
    (nextQuery: CatalogListQuery) => {
      const params = buildCatalogSearchParams(nextQuery, { searchQuery });
      const href = params.size > 0 ? `${pathname}?${params}` : pathname;
      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [pathname, router, searchQuery],
  );

  function updateFilters(nextFilters: CatalogFilterState) {
    navigateWithQuery({
      ...nextFilters,
      sort: query.sort,
      page: 1,
    });
  }

  function updateSort(nextSort: SortOptionValue) {
    navigateWithQuery({
      ...filters,
      sort: nextSort,
      page: 1,
    });
  }

  function buildPageHref(page: number) {
    const params = buildCatalogSearchParams(
      { ...filters, sort: query.sort, page },
      { searchQuery },
    );
    return params.size > 0 ? `${pathname}?${params}` : pathname;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr] xl:grid-cols-[16rem_1fr]">
      <CatalogFiltersPanel
        facets={facets}
        value={filters}
        onChange={updateFilters}
        activeCount={activeFilterCount}
        className="hidden lg:block"
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <button
            type="button"
            className="inline-flex h-11 min-h-11 w-full items-center justify-center rounded-md border px-3 text-sm font-medium sm:w-auto lg:hidden"
            onClick={() => setMobileFiltersOpen(true)}
          >
            Фильтры{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <SortToolbar
            value={query.sort}
            onChange={updateSort}
            totalCount={total}
            disabled={products.length === 0 && total === 0}
            className="w-full sm:flex-1"
          />
        </div>

        {isPending ? (
          <p className="text-sm text-muted-foreground">Обновляем результаты...</p>
        ) : null}

        <ProductGrid products={products} emptyMessage={emptyMessage} />

        <CatalogPagination
          page={query.page}
          totalPages={totalPages}
          buildHref={buildPageHref}
        />

        {mobileFiltersOpen ? (
          <CatalogFiltersPanel
            facets={facets}
            value={filters}
            onChange={updateFilters}
            mobileOpen={mobileFiltersOpen}
            onMobileOpenChange={setMobileFiltersOpen}
            activeCount={activeFilterCount}
            className="lg:hidden"
          />
        ) : null}
      </div>
    </div>
  );
}
