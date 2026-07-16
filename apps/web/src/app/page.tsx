import type { Metadata } from "next";

import { SectionTabs } from "@/components/store/catalog/section-tabs";
import type { SectionTabData } from "@/components/store/catalog/section-tabs";
import { PageContainer } from "@/components/store/layout/page-container";
import { PromoBanner } from "@/components/store/marketing/promo-banner";
import { SeoContentBlock } from "@/components/store/marketing/seo-content-block";
import { listProducts } from "@/lib/api";
import { getAccessToken, getCurrentUser } from "@/lib/auth/session";
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
  let sectionTabs: SectionTabData[] = [];

  try {
    const [hits, newItems, saleItems] = await Promise.all([
      listProducts(1, HOMEPAGE_SECTION_LIMIT, undefined, token, {
        in_stock: true,
        sort: "default",
      }),
      listProducts(1, HOMEPAGE_SECTION_LIMIT, undefined, token, {
        sort: "default",
      }),
      listProducts(1, HOMEPAGE_SECTION_LIMIT, undefined, token, {
        on_sale: true,
        sort: "default",
      }),
    ]);

    sectionTabs = [
      {
        id: "recommended",
        products: toProductGridItems(hits.items, isWholesaler),
        viewAllHref: "/catalog?in_stock=1",
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
  } catch {
    error =
      "Не удалось загрузить товары. Убедитесь, что API запущен и доступен.";
  }

  const hasSections = sectionTabs.some((tab) => tab.products.length > 0);

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

      {hasSections ? (
        <section aria-labelledby="catalog-tabs-heading" className="space-y-4">
          <h2 id="catalog-tabs-heading" className="store-section-title">
            Подборки
          </h2>
          <SectionTabs tabs={sectionTabs} />
        </section>
      ) : null}

      <SeoContentBlock />
    </PageContainer>
  );
}
