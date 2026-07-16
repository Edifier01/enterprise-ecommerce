"use client";

import Link from "next/link";
import { useState } from "react";

import type { ProductGridItem } from "@/components/store/catalog/product-grid";
import { ProductGrid } from "@/components/store/catalog/product-grid";
import { cn } from "@/lib/utils";

export const SECTION_TAB_IDS = ["recommended", "new", "special"] as const;

export type SectionTabId = (typeof SECTION_TAB_IDS)[number];

export const SECTION_TAB_LABELS: Record<SectionTabId, string> = {
  recommended: "Хиты сезона",
  new: "Новинки",
  special: "Распродажа",
};

export type SectionTabData = {
  id: SectionTabId;
  products: ProductGridItem[];
  viewAllHref: string;
};

export interface SectionTabsProps {
  tabs: SectionTabData[];
  className?: string;
}

export function SectionTabs({ tabs, className }: SectionTabsProps) {
  const [activeTab, setActiveTab] = useState<SectionTabId>(
    tabs[0]?.id ?? "recommended",
  );

  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  if (!active) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div
          role="tablist"
          aria-label="Разделы каталога"
          className="flex gap-1 overflow-x-auto border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {SECTION_TAB_LABELS[tab.id]}
              </button>
            );
          })}
        </div>

        <Link href={active.viewAllHref} className="store-section-link shrink-0">
          Смотреть все →
        </Link>
      </div>

      <div role="tabpanel">
        <ProductGrid
          products={active.products}
          emptyMessage="В этом разделе пока нет товаров."
        />
      </div>
    </div>
  );
}
