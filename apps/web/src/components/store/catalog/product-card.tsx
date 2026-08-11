import Link from "next/link";

import { AddToCartButton } from "@/components/store/catalog/add-to-cart-button";
import { ProductThumbnail } from "@/components/store/catalog/product-thumbnail";
import { StoreStatusBadge, getStoreStockState } from "@/components/store/ui/store-status-badge";
import type { Product } from "@/lib/api";
import {
  formatCompareAtPrice,
  formatPrice,
  getDiscountPercent,
} from "@/lib/store/format";
import { getSwatchStyle } from "@/lib/store/color-swatch";
import { cn } from "@/lib/utils";

export type ProductCardProduct = Pick<
  Product,
  "name" | "slug" | "price_cents" | "currency" | "in_stock"
>;

export interface ProductCardProps {
  product: ProductCardProduct;
  compareAtCents?: number;
  imageSrc?: string;
  className?: string;
  isWholesaler?: boolean;
  wholesalePriceCents?: number;
  defaultVariantId?: string;
  priceFromCents?: number;
  showFromPrice?: boolean;
  colorOptions?: string[];
}

export function ProductCard({
  product,
  compareAtCents,
  imageSrc,
  className,
  isWholesaler = false,
  wholesalePriceCents,
  defaultVariantId,
  priceFromCents,
  showFromPrice = false,
  colorOptions = [],
}: ProductCardProps) {
  const discount = compareAtCents
    ? getDiscountPercent(product.price_cents, compareAtCents)
    : null;
  const onSale = discount !== null && discount > 0;
  const visibleColors = colorOptions.slice(0, 4);
  const hiddenColorCount = Math.max(colorOptions.length - visibleColors.length, 0);

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-lg border bg-card ring-1 ring-foreground/5 transition-shadow hover:shadow-md",
        className
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-muted"
      >
        <ProductThumbnail
          src={imageSrc}
          productSlug={product.slug}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {onSale ? (
          <span className="absolute left-2 top-2">
            <StoreStatusBadge state="sale" label={discount ? `Скидка −${discount}%` : "Скидка"} />
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors hover:text-primary sm:text-base"
        >
          {product.name}
        </Link>

        {visibleColors.length > 0 ? (
          <div className="flex items-center gap-1.5" aria-label="Доступные цвета">
            {visibleColors.map((color) => (
              <span
                key={color}
                title={color}
                className="size-4 rounded-full border border-input"
                style={getSwatchStyle(color)}
              />
            ))}
            {hiddenColorCount > 0 ? (
              <span className="text-xs text-muted-foreground">+{hiddenColorCount}</span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {isWholesaler && wholesalePriceCents != null ? (
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="text-muted-foreground">
                  Розница:{" "}
                  <span className="font-medium text-foreground">
                    {formatPrice(product.price_cents, product.currency)}
                  </span>
                </span>
                <span className="store-price-sale">
                  Опт: {formatPrice(wholesalePriceCents, product.currency)}
                </span>
              </div>
            ) : onSale && compareAtCents ? (
              <>
                <span className="store-price-sale">
                  {formatPrice(product.price_cents, product.currency)}
                </span>
                <span className="store-price-compare">
                  {formatCompareAtPrice(compareAtCents, product.currency)}
                </span>
              </>
            ) : (
              <span className="store-price">
                {showFromPrice && priceFromCents != null
                  ? `От ${formatPrice(priceFromCents, product.currency)}`
                  : formatPrice(product.price_cents, product.currency)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <StoreStatusBadge state={getStoreStockState(product.in_stock)} />

            {defaultVariantId ? (
              <AddToCartButton
                variantId={defaultVariantId}
                productName={product.name}
                disabled={!product.in_stock}
                size="default"
                className="min-h-11"
              />
            ) : (
              <Link
                href={`/products/${product.slug}`}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-store-cta px-3 text-xs font-medium text-store-cta-foreground hover:bg-store-cta/90"
              >
                Купить
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
