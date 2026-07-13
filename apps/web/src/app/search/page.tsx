import type { Metadata } from "next";

import { CatalogSearchForm } from "@/components/store/catalog/catalog-search-form";
import { ProductGrid } from "@/components/store/catalog/product-grid";
import { PageContainer } from "@/components/store/layout/page-container";
import { searchProducts } from "@/lib/api";
import { getAccessToken, getCurrentUser } from "@/lib/auth/session";
import { toProductGridItems } from "@/lib/store/product-grid";

export const metadata: Metadata = {
  title: "Поиск",
  description: "Поиск по каталогу товаров",
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const token = await getAccessToken();
  const user = await getCurrentUser();
  const isWholesaler = user?.is_wholesaler ?? false;

  let results: Awaited<ReturnType<typeof searchProducts>> | null = null;
  let error: string | null = null;

  if (query) {
    try {
      results = await searchProducts(query, 1, 24, token);
    } catch {
      error = "Не удалось выполнить поиск. Убедитесь, что API запущен и доступен.";
    }
  }

  const products = toProductGridItems(results?.items ?? [], isWholesaler);

  return (
    <PageContainer as="div" className="space-y-8">
      <header className="space-y-2 text-center sm:text-left">
        <h1 className="store-section-title">Поиск</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Найдите нужный товар по названию или артикулу
        </p>
      </header>

      <div className="mx-auto max-w-xl">
        <CatalogSearchForm defaultQuery={query} />
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {query ? (
        <section aria-labelledby="search-results-heading" className="space-y-4">
          <h2 id="search-results-heading" className="text-lg font-semibold">
            {results
              ? `Найдено: ${results.total}`
              : "Результаты поиска"}
          </h2>
          <ProductGrid
            products={products}
            emptyMessage={`По запросу «${query}» ничего не найдено.`}
          />
        </section>
      ) : (
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          Введите название товара или артикул в поле выше.
        </p>
      )}
    </PageContainer>
  );
}
