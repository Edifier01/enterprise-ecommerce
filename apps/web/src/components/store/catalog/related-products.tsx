import Link from "next/link";

import { ProductGrid, type ProductGridItem } from "@/components/store/catalog/product-grid";

export interface RelatedProductsProps {
  products: ProductGridItem[];
  categoryHref?: string;
  categoryName?: string;
}

export function RelatedProducts({
  products,
  categoryHref,
  categoryName,
}: RelatedProductsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-products-heading" className="space-y-4 border-t pt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="related-products-heading" className="store-section-title text-xl">
          Похожие товары
        </h2>
        {categoryHref && categoryName ? (
          <Link href={categoryHref} className="store-section-link shrink-0">
            Все в «{categoryName}» →
          </Link>
        ) : null}
      </div>
      <ProductGrid
        products={products}
        listClassName="grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
        emptyMessage=""
      />
    </section>
  );
}
