import type { Metadata } from "next";

import { CategoryGrid } from "@/components/store/catalog/category-grid";
import { HomepageProductSections } from "@/components/store/catalog/homepage-product-sections";
import type { HomepageProductSectionData } from "@/components/store/catalog/homepage-product-sections";
import { PageContainer } from "@/components/store/layout/page-container";
import { SectionHeader } from "@/components/store/layout/section-header";
import { TrustBar } from "@/components/store/layout/trust-bar";
import { HomepageIntro } from "@/components/store/marketing/homepage-intro";
import { PromoBanner } from "@/components/store/marketing/promo-banner";
import { SeoContentBlock } from "@/components/store/marketing/seo-content-block";
import { StoreEmptyState } from "@/components/store/ui/store-empty-state";
import { StoreErrorState } from "@/components/store/ui/store-error-state";
import { getCategories, listProducts } from "@/lib/api";
import { getAccessToken, getCurrentUser } from "@/lib/auth/session";
import { allowStaticCategoryFallback } from "@/lib/store/category-fallback";
import { getRootCategories } from "@/lib/store/categories";
import { toProductGridItems } from "@/lib/store/product-grid";
import { siteConfig } from "@/lib/store/site-config";

export const metadata: Metadata = {
  title: "Главная",
  description: siteConfig.description,
};

const HOMEPAGE_SECTION_LIMIT = 8;

export default async function HomePage() {
  const token = await getAccessToken();
  const user = await getCurrentUser();
  const isWholesaler = user?.is_wholesaler ?? false;

  let error: string | null = null;
  let sections: HomepageProductSectionData[] = [];
  let categoryCards: { slug: string; name: string; description?: string; productCount?: number }[] =
    [];

  try {
    const [recommended, newItems, saleItems, apiCategories] = await Promise.all([
      listProducts(1, HOMEPAGE_SECTION_LIMIT, undefined, token, {
        in_stock: true,
        sort: "popular",
      }),
      listProducts(1, HOMEPAGE_SECTION_LIMIT, undefined, token, {
        sort: "default",
      }),
      listProducts(1, HOMEPAGE_SECTION_LIMIT, undefined, token, {
        on_sale: true,
        sort: "default",
      }),
      getCategories().catch(() => null),
    ]);

    sections = [
      {
        id: "recommended",
        products: toProductGridItems(recommended.items, isWholesaler),
        viewAllHref: "/catalog?sort=popular&in_stock=1",
      },
      {
        id: "new",
        products: toProductGridItems(newItems.items, isWholesaler),
        viewAllHref: "/catalog",
      },
      {
        id: "special",
        products: toProductGridItems(saleItems.items, isWholesaler),
        viewAllHref: "/catalog?on_sale=1",
      },
    ];

    if (apiCategories && apiCategories.items.length > 0) {
      categoryCards = apiCategories.items
        .filter((category) => category.parent_id === null)
        .map((category) => ({
          slug: category.slug,
          name: category.name,
          description: category.description ?? undefined,
          productCount: category.product_count,
        }));
    } else if (allowStaticCategoryFallback()) {
      categoryCards = getRootCategories().map((category) => ({
        slug: category.slug,
        name: category.name,
        description: category.description,
        productCount: 0,
      }));
    }
  } catch {
    error =
      "Не удалось загрузить товары. Убедитесь, что API запущен и доступен.";
  }

  const hasSections = sections.some((section) => section.products.length > 0);

  return (
    <PageContainer as="div" className="space-y-8 sm:space-y-10">
      <HomepageIntro />

      {siteConfig.homepagePromosEnabled ? <PromoBanner /> : null}

      {categoryCards.length > 0 ? (
        <section aria-labelledby="home-categories-heading" className="space-y-4">
          <SectionHeader
            title="Категории"
            titleId="home-categories-heading"
            viewAllHref="/catalog"
            viewAllLabel="Весь каталог"
          />
          <CategoryGrid categories={categoryCards} />
        </section>
      ) : null}

      {error ? (
        <StoreErrorState
          title="Не удалось загрузить товары"
          description="Убедитесь, что API запущен и доступен."
          action={{ label: "Перейти в каталог", href: "/catalog" }}
        />
      ) : null}

      {!error && hasSections ? <HomepageProductSections sections={sections} /> : null}

      {!error && !hasSections ? (
        <StoreEmptyState
          title="Каталог пока пуст"
          description="Товары появятся после публикации в админ-панели."
          action={{ label: "Перейти в каталог", href: "/catalog" }}
        />
      ) : null}

      <TrustBar />

      <SeoContentBlock />
    </PageContainer>
  );
}
