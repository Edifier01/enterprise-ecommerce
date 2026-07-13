import type { Metadata } from "next";

import { CategoryGrid } from "@/components/store/catalog/category-grid";
import { ProductGrid } from "@/components/store/catalog/product-grid";
import { PageContainer } from "@/components/store/layout/page-container";
import { SeoContentBlock } from "@/components/store/marketing/seo-content-block";
import { getCategories, listProducts } from "@/lib/api";
import { getAccessToken, getCurrentUser } from "@/lib/auth/session";
import { getRootCategories } from "@/lib/store/categories";
import { toProductGridItems } from "@/lib/store/product-grid";
import { siteConfig } from "@/lib/store/site-config";

export const metadata: Metadata = {
  title: "Каталог",
  description: "Разделы каталога и популярные товары",
};

export default async function CatalogPage() {
  const token = await getAccessToken();
  const user = await getCurrentUser();
  const isWholesaler = user?.is_wholesaler ?? false;

  let products: Awaited<ReturnType<typeof listProducts>> | null = null;
  let error: string | null = null;

  try {
    products = await listProducts(1, 48, undefined, token);
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

  const items = products?.items ?? [];

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

  const popularProducts = [...toProductGridItems(items, isWholesaler)]
    .sort((a, b) => Number(b.in_stock) - Number(a.in_stock))
    .slice(0, 8);

  return (
    <PageContainer as="div" className="space-y-10 sm:space-y-12">
      <header className="space-y-2">
        <h1 className="store-section-title">Каталог</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Выберите раздел или просмотрите популярные товары.{" "}
          {siteConfig.catalogDisclaimer}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <section aria-labelledby="catalog-categories-heading" className="space-y-4">
        <h2 id="catalog-categories-heading" className="text-lg font-semibold">
          Разделы
        </h2>
        <CategoryGrid categories={categoryCards} />
      </section>

      <section aria-labelledby="popular-products-heading" className="space-y-4">
        <h2 id="popular-products-heading" className="store-section-title">
          Популярные товары
        </h2>
        <ProductGrid
          products={popularProducts}
          emptyMessage="Товары появятся после добавления данных в каталог."
        />
      </section>

      <SeoContentBlock
        title="Покупки в СУХОПУТ"
        paragraphs={[
          "В нашем каталоге собраны товары для разных задач — от повседневных покупок до специализированных категорий. Используйте разделы выше, чтобы быстро перейти к нужной группе товаров.",
          "Ассортимент регулярно обновляется. Если вы не нашли нужный раздел, воспользуйтесь поиском или обратитесь в службу поддержки — мы подскажем альтернативу или сообщим о поступлении.",
        ]}
      />
    </PageContainer>
  );
}
