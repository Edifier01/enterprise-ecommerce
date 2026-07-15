"use client";

import { useEffect, useState } from "react";

import { AddToCartButton } from "@/components/store/catalog/add-to-cart-button";
import type { Product, ProductVariant } from "@/lib/api";
import { formatPrice } from "@/lib/store/format";
import { cn } from "@/lib/utils";

function pickDefaultVariant(variants: ProductVariant[]): ProductVariant | null {
  if (variants.length === 0) {
    return null;
  }
  return variants.find((variant) => variant.is_default) ?? variants[0];
}

export function ProductStickyBar({
  product,
  selectedVariantId,
  inStock,
}: {
  product: Product;
  selectedVariantId: string | null;
  inStock: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("product-purchase-sentinel");
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const selected =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    pickDefaultVariant(product.variants);
  const price = selected?.price_cents ?? product.price_cents;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(var(--store-mobile-nav-height))] z-40 border-t bg-background/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-200 md:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {product.name}
          </p>
          <p className="store-price text-base">{formatPrice(price, product.currency)}</p>
        </div>
        {selected ? (
          <AddToCartButton
            variantId={selected.id}
            productName={product.name}
            disabled={!inStock}
            size="default"
            className="shrink-0"
            label="В корзину"
          />
        ) : null}
      </div>
    </div>
  );
}
