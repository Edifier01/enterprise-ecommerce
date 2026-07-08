import type { Metadata } from "next";

import { ProductGrid } from "@/components/store/catalog/product-grid";
import { SectionTabs } from "@/components/store/catalog/section-tabs";
import { PageContainer } from "@/components/store/layout/page-container";
import { PromoBanner } from "@/components/store/marketing/promo-banner";
import { SeoContentBlock } from "@/components/store/marketing/seo-content-block";
import { listProducts } from "@/lib/api";
import { siteConfig } from "@/lib/store/site-config";

export const metadata: Metadata = {
  title: "Главная",
  description: siteConfig.description,
};

export default async function HomePage() {
  let products: Awaited<ReturnType<typeof listProducts>> | null = null;
  let error: string | null = null;

  try {
    products = await listProducts(1, 24);
  } catch {
    error =
      "Не удалось загрузить товары. Убедитесь, что API запущен и доступен.";
  }

  const items = products?.items ?? [];
  const newArrivals = [...items].reverse().slice(0, 8);

  return (
    <PageContainer as="div" className="space-y-10 sm:space-y-12">
      <PromoBanner />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <section aria-labelledby="new-arrivals-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="new-arrivals-heading" className="store-section-title">
            Новинки
          </h2>
          {products ? (
            <p className="text-sm text-muted-foreground">
              {products.total}{" "}
              {products.total === 1
                ? "товар"
                : products.total < 5
                  ? "товара"
                  : "товаров"}{" "}
              в каталоге
            </p>
          ) : null}
        </div>

        <ProductGrid
          products={newArrivals}
          emptyMessage="Новинки появятся после добавления товаров в каталог."
        />
      </section>

      {items.length > 0 ? (
        <section aria-labelledby="catalog-tabs-heading" className="space-y-4">
          <h2 id="catalog-tabs-heading" className="store-section-title">
            Каталог
          </h2>
          <SectionTabs products={items} limit={8} />
        </section>
      ) : null}

      <SeoContentBlock />
    </PageContainer>
  );
}
