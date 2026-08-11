"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ProductGridItem } from "@/components/store/catalog/product-grid";
import { ProductGrid } from "@/components/store/catalog/product-grid";
import { cn } from "@/lib/utils";

export const SECTION_TAB_IDS = ["recommended", "new", "special"] as const;

export type SectionTabId = (typeof SECTION_TAB_IDS)[number];

export const SECTION_TAB_LABELS: Record<SectionTabId, string> = {
  recommended: "Рекомендации",
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
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.products.length > 0),
    [tabs],
  );

  const [activeTab, setActiveTab] = useState<SectionTabId>(
    visibleTabs[0]?.id ?? "recommended",
  );

  const active =
    visibleTabs.find((tab) => tab.id === activeTab) ?? visibleTabs[0] ?? null;

  if (!active || visibleTabs.length === 0) {
    return null;
  }

  const panelId = `homepage-section-${active.id}`;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div
          role="tablist"
          aria-label="Разделы каталога"
          className="flex gap-1 overflow-x-auto border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visibleTabs.map((tab) => {
            const isActive = tab.id === active.id;
            const tabId = `homepage-tab-${tab.id}`;

            return (
              <button
                key={tab.id}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{SECTION_TAB_LABELS[tab.id]}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.products.length}
                </span>
              </button>
            );
          })}
        </div>

        <Link href={active.viewAllHref} className="store-section-link shrink-0">
          Смотреть все →
        </Link>
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={`homepage-tab-${active.id}`}>
        <ProductGrid
          products={active.products}
          emptyMessage="В этом разделе пока нет товаров."
        />
      </div>
    </div>
  );
}
