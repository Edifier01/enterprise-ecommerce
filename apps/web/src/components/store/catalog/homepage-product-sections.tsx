import { ProductGrid } from "@/components/store/catalog/product-grid";
import type { ProductGridItem } from "@/components/store/catalog/product-grid";
import {
  SECTION_TAB_LABELS,
  type SectionTabId,
} from "@/components/store/catalog/section-tabs";
import { SectionHeader } from "@/components/store/layout/section-header";

export type HomepageProductSectionData = {
  id: SectionTabId;
  products: ProductGridItem[];
  viewAllHref: string;
};

export function HomepageProductSections({
  sections,
}: {
  sections: HomepageProductSectionData[];
}) {
  const visible = sections.filter((section) => section.products.length > 0);
  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {visible.map((section) => {
        const titleId = `home-section-${section.id}`;
        return (
          <section key={section.id} aria-labelledby={titleId} className="space-y-4">
            <SectionHeader
              title={SECTION_TAB_LABELS[section.id]}
              titleId={titleId}
              viewAllHref={section.viewAllHref}
            />
            <ProductGrid
              products={section.products}
              emptyMessage="В этом разделе пока нет товаров."
            />
          </section>
        );
      })}
    </div>
  );
}
