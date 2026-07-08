"use client";

import { useMemo, useState } from "react";

import { ProductGrid, type ProductGridItem } from "./product-grid";
import {
  SortToolbar,
  sortProducts,
  type SortOptionValue,
} from "./sort-toolbar";

export interface CategoryProductListProps {
  products: ProductGridItem[];
  emptyMessage?: string;
}

export function CategoryProductList({
  products,
  emptyMessage = "В этом разделе пока нет товаров.",
}: CategoryProductListProps) {
  const [sort, setSort] = useState<SortOptionValue>("default");

  const sortedProducts = useMemo(
    () => sortProducts(products, sort),
    [products, sort]
  );

  return (
    <div className="space-y-4">
      <SortToolbar
        value={sort}
        onChange={setSort}
        totalCount={sortedProducts.length}
        disabled={products.length === 0}
      />
      <ProductGrid products={sortedProducts} emptyMessage={emptyMessage} />
    </div>
  );
}
