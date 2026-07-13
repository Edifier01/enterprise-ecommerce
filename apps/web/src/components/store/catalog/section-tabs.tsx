"use client";

import { useMemo, useState } from "react";

import type { ProductGridItem } from "@/components/store/catalog/product-grid";
import { ProductGrid } from "@/components/store/catalog/product-grid";
import { cn } from "@/lib/utils";

export const SECTION_TAB_IDS = ["recommended", "new", "special"] as const;

export type SectionTabId = (typeof SECTION_TAB_IDS)[number];

export const SECTION_TAB_LABELS: Record<SectionTabId, string> = {
  recommended: "Рекомендуемые",
  new: "Новинки",
  special: "Спецпредложения",
};

export type SectionTabCompareAtMap = Record<string, number | undefined>;

export interface SectionTabsProps {
  products: ProductGridItem[];
  /** Optional mock compare-at prices keyed by product slug (sale UI). */
  compareAtBySlug?: SectionTabCompareAtMap;
  limit?: number;
  className?: string;
}

function filterProductsForTab(
  products: ProductGridItem[],
  tab: SectionTabId,
  limit: number
): ProductGridItem[] {
  switch (tab) {
    case "recommended":
      return [...products]
        .sort((a, b) => Number(b.in_stock) - Number(a.in_stock))
        .slice(0, limit);
    case "new":
      return [...products].reverse().slice(0, limit);
    case "special":
      return products.filter((_, index) => index % 2 === 0).slice(0, limit);
    default:
      return products.slice(0, limit);
  }
}

function buildCompareAtMap(
  products: ProductGridItem[],
  tab: SectionTabId,
  compareAtBySlug?: SectionTabCompareAtMap
): SectionTabCompareAtMap | undefined {
  if (tab !== "special") {
    return compareAtBySlug;
  }

  const mockSales: SectionTabCompareAtMap = {};

  for (const product of products) {
    if (compareAtBySlug?.[product.slug]) {
      mockSales[product.slug] = compareAtBySlug[product.slug];
      continue;
    }

    mockSales[product.slug] = Math.round(product.price_cents * 1.15);
  }

  return mockSales;
}

export function SectionTabs({
  products,
  compareAtBySlug,
  limit = 8,
  className,
}: SectionTabsProps) {
  const [activeTab, setActiveTab] = useState<SectionTabId>("recommended");

  const visibleProducts = useMemo(
    () => filterProductsForTab(products, activeTab, limit),
    [products, activeTab, limit]
  );

  const activeCompareAt = useMemo(
    () => buildCompareAtMap(visibleProducts, activeTab, compareAtBySlug),
    [visibleProducts, activeTab, compareAtBySlug]
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div
        role="tablist"
        aria-label="Разделы каталога"
        className="flex gap-1 overflow-x-auto border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTION_TAB_IDS.map((tabId) => {
          const isActive = activeTab === tabId;

          return (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tabId)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {SECTION_TAB_LABELS[tabId]}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        <ProductGrid
          products={visibleProducts.map((product) => ({
            ...product,
            compareAtCents: activeCompareAt?.[product.slug] ?? product.compareAtCents,
          }))}
          emptyMessage="В этом разделе пока нет товаров."
        />
      </div>
    </div>
  );
}
