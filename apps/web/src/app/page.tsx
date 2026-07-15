import type { Metadata } from "next";

import { CategoryGrid } from "@/components/store/catalog/category-grid";
import { ProductGrid } from "@/components/store/catalog/product-grid";
import { SectionTabs } from "@/components/store/catalog/section-tabs";
import { PageContainer } from "@/components/store/layout/page-container";
import { SectionHeader } from "@/components/store/layout/section-header";
import { PromoBanner } from "@/components/store/marketing/promo-banner";
import { SeoContentBlock } from "@/components/store/marketing/seo-content-block";
import { getCategories, listProducts } from "@/lib/api";
import { getAccessToken, getCurrentUser } from "@/lib/auth/session";
import { getRootCategories } from "@/lib/store/categories";
import { toProductGridItems } from "@/lib/store/product-grid";
import { siteConfig } from "@/lib/store/site-config";

export const metadata: Metadata = {
  title: "Главная",
  description: siteConfig.description,
};

export default async function HomePage() {
  const token = await getAccessToken();
  const user = await getCurrentUser();
  const isWholesaler = user?.is_wholesaler ?? false;

  let products: Awaited<ReturnType<typeof listProducts>> | null = null;
  let error: string | null = null;

  try {
    products = await listProducts(1, 24, undefined, token);
  } catch {
    error =
      "Не удалось загрузить товары. Убедитесь, что API запущен и доступен.";
  }

  let apiCategories: Awaited<ReturnType<typeof getCategories>> | null = null;
  try {
    apiCategories = await getCategories();
  } catch {
    // Fall back to static categories when API is unavailable
  }

  const categoryCards =
    apiCategories !== null
      ? apiCategories.items
          .filter((c) => c.parent_id === null)
          .map((c) => ({
            slug: c.slug,
            name: c.name,
            description: c.description ?? undefined,
            productCount: 0,
          }))
      : getRootCategories().map((c) => ({
          slug: c.slug,
          name: c.name,
          description: c.description,
          productCount: 0,
        }));

  const items = products?.items ?? [];
  const gridItems = toProductGridItems(items, isWholesaler);
  const newArrivals = [...gridItems].reverse().slice(0, 8);

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

      <section aria-labelledby="home-categories-heading" className="space-y-4">
        <SectionHeader
          title="Категории снаряжения"
          titleId="home-categories-heading"
          subtitle="Разгрузки, одежда, обувь и аксессуары для полевых условий"
          viewAllHref="/catalog"
          viewAllLabel="Весь каталог"
        />
        <CategoryGrid categories={categoryCards} />
      </section>

      <section aria-labelledby="new-arrivals-heading" className="space-y-4">
        <SectionHeader
          title="Новинки"
          titleId="new-arrivals-heading"
          subtitle={
            products
              ? `${products.total} ${
                  products.total === 1
                    ? "товар"
                    : products.total < 5
                      ? "товара"
                      : "товаров"
                } в каталоге`
              : undefined
          }
          viewAllHref="/catalog"
        />

        <ProductGrid
          products={newArrivals}
          emptyMessage="Новинки появятся после добавления товаров в каталог."
        />
      </section>

      {items.length > 0 ? (
        <section aria-labelledby="catalog-tabs-heading" className="space-y-4">
          <SectionHeader
            title="Подборки"
            titleId="catalog-tabs-heading"
            viewAllHref="/catalog"
          />
          <SectionTabs products={gridItems} limit={8} />
        </section>
      ) : null}

      <SeoContentBlock />
    </PageContainer>
  );
}
