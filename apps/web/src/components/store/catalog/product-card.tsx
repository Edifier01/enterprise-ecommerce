import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/api";
import {
  formatCompareAtPrice,
  formatPrice,
  getDiscountPercent,
} from "@/lib/store/format";
import { siteConfig } from "@/lib/store/site-config";
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
}

export function ProductCard({
  product,
  compareAtCents,
  imageSrc,
  className,
}: ProductCardProps) {
  const discount = compareAtCents
    ? getDiscountPercent(product.price_cents, compareAtCents)
    : null;
  const onSale = discount !== null && discount > 0;
  const placeholder = siteConfig.images.productPlaceholder;

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border bg-card ring-1 ring-foreground/5 transition-shadow hover:shadow-md",
        className
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        <Image
          src={imageSrc ?? placeholder}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {onSale ? (
          <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-store-sale px-2 py-0.5 text-xs font-medium text-store-sale-foreground">
            Скидка{discount ? ` −${discount}%` : ""}
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

        <div className="mt-auto space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {onSale && compareAtCents ? (
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
                {formatPrice(product.price_cents, product.currency)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {product.in_stock ? (
              <span className="inline-flex items-center rounded-full bg-store-success px-2 py-0.5 text-xs font-medium text-store-success-foreground">
                В наличии
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-store-muted-badge px-2 py-0.5 text-xs font-medium text-store-muted-badge-foreground">
                Нет в наличии
              </span>
            )}

            <Button
              size="sm"
              disabled={!product.in_stock}
              className="bg-store-cta text-store-cta-foreground hover:bg-store-cta/90 disabled:opacity-50"
              render={
                product.in_stock ? (
                  <Link href={`/cart?add=${product.slug}`} />
                ) : undefined
              }
            >
              Купить
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
