import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

import {
  ProductCard,
  type ProductCardProduct,
  type ProductCardProps,
} from "./product-card";

export type ProductGridItem = ProductCardProduct & {
  compareAtCents?: number;
  imageSrc?: string;
  isWholesaler?: boolean;
  wholesalePriceCents?: number;
  defaultVariantId?: string;
};

export interface ProductGridProps {
  products: ProductGridItem[];
  emptyMessage?: string;
  className?: string;
  listClassName?: string;
  getProductCardProps?: (
    product: ProductGridItem
  ) => Partial<Omit<ProductCardProps, "product">>;
}

export function ProductGrid({
  products,
  emptyMessage = "Товары не найдены.",
  className,
  listClassName,
  getProductCardProps,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul
      className={cn(siteConfig.layout.productGridClass, listClassName, className)}
    >
      {products.map((product) => {
        const { compareAtCents, imageSrc, ...cardProduct } = product;
        const extraProps = getProductCardProps?.(product) ?? {};

        return (
          <li key={cardProduct.slug} className="min-w-0">
            <ProductCard
              product={cardProduct}
              compareAtCents={compareAtCents ?? extraProps.compareAtCents}
              imageSrc={imageSrc ?? extraProps.imageSrc}
              className={extraProps.className}
              isWholesaler={product.isWholesaler ?? extraProps.isWholesaler}
              wholesalePriceCents={
                product.wholesalePriceCents ?? extraProps.wholesalePriceCents
              }
              defaultVariantId={
                product.defaultVariantId ?? extraProps.defaultVariantId
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
