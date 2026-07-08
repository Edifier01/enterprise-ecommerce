"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Product, ProductVariant } from "@/lib/api";
import {
  formatCompareAtPrice,
  formatPrice,
  getDiscountPercent,
} from "@/lib/store/format";
import { cn } from "@/lib/utils";

export interface ProductPurchasePanelProps {
  product: Product;
}

function pickDefaultVariant(variants: ProductVariant[]): ProductVariant | null {
  if (variants.length === 0) {
    return null;
  }
  return variants.find((variant) => variant.is_default) ?? variants[0];
}

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const variants = [...product.variants].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    () => pickDefaultVariant(variants)?.id ?? null
  );

  const selected = variants.find((variant) => variant.id === selectedId) ?? null;

  const currentPrice = selected?.price_cents ?? product.price_cents;
  const inStock = selected ? selected.in_stock : product.in_stock;
  const compareAt = product.compare_at_price_cents;
  const discount = compareAt ? getDiscountPercent(currentPrice, compareAt) : null;
  const onSale = discount !== null && discount > 0;

  // Prefer the concrete SKU when a variant is selected; fall back to the slug.
  const buyReference = selected ? selected.sku : product.slug;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        {onSale && compareAt ? (
          <>
            <span className="store-price-sale text-2xl sm:text-3xl">
              {formatPrice(currentPrice, product.currency)}
            </span>
            <span className="store-price-compare text-lg">
              {formatCompareAtPrice(compareAt, product.currency)}
            </span>
            <span className="inline-flex items-center rounded-full bg-store-sale px-2 py-0.5 text-xs font-medium text-store-sale-foreground">
              −{discount}%
            </span>
          </>
        ) : (
          <span className="store-price text-2xl sm:text-3xl">
            {formatPrice(currentPrice, product.currency)}
          </span>
        )}
      </div>

      {inStock ? (
        <span className="inline-flex w-fit items-center rounded-full bg-store-success px-2.5 py-1 text-sm font-medium text-store-success-foreground">
          В наличии
        </span>
      ) : (
        <span className="inline-flex w-fit items-center rounded-full bg-store-muted-badge px-2.5 py-1 text-sm font-medium text-store-muted-badge-foreground">
          Нет в наличии
        </span>
      )}

      {variants.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">
            Вариант
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => {
              const isActive = variant.id === selectedId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelectedId(variant.id)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input bg-background text-muted-foreground hover:border-ring",
                    !variant.in_stock && "opacity-50"
                  )}
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <Button
        size="lg"
        disabled={!inStock}
        className="w-full bg-store-cta text-store-cta-foreground hover:bg-store-cta/90 disabled:opacity-50 sm:w-auto sm:min-w-48"
        render={
          inStock ? (
            <Link href={`/cart?add=${encodeURIComponent(buyReference)}`} />
          ) : undefined
        }
      >
        Купить
      </Button>
    </div>
  );
}
