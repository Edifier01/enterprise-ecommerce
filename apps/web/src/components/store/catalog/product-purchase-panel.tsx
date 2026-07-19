"use client";

import { useMemo, useState } from "react";

import { AddToCartButton } from "@/components/store/catalog/add-to-cart-button";
import { ProductStickyBar } from "@/components/store/catalog/product-sticky-bar";
import {
  FlatVariantSelector,
  VariantSelector,
  isSelectionComplete,
} from "@/components/store/catalog/variant-selector";
import type { Product } from "@/lib/api";
import {
  formatCompareAtPrice,
  formatPrice,
  getDiscountPercent,
} from "@/lib/store/format";
import {
  pickDefaultSelection,
  pickDefaultVariant,
  resolveVariant,
  usesStructuredSelector,
  type VariantSelection,
} from "@/lib/store/variant-options";

export interface ProductPurchasePanelProps {
  product: Product;
  isWholesaler?: boolean;
  onColorChange?: (color: string | null) => void;
}

export function ProductPurchasePanel({
  product,
  isWholesaler = false,
  onColorChange,
}: ProductPurchasePanelProps) {
  const variants = useMemo(
    () => [...product.variants].sort((a, b) => a.sort_order - b.sort_order),
    [product.variants],
  );
  const structured = usesStructuredSelector(product.option_groups, variants.length);

  const [selection, setSelection] = useState<VariantSelection>(() =>
    structured ? pickDefaultSelection(variants, product.option_groups) : {},
  );
  const [flatSelectedId, setFlatSelectedId] = useState<string | null>(
    () => pickDefaultVariant(variants)?.id ?? null,
  );

  const selected = structured
    ? resolveVariant(variants, selection)
    : variants.find((variant) => variant.id === flatSelectedId) ?? null;

  const currentPrice = selected?.price_cents ?? product.price_cents;
  const wholesalePrice =
    isWholesaler && selected?.wholesale_price_cents != null
      ? selected.wholesale_price_cents
      : null;
  const inStock = selected ? selected.in_stock : product.in_stock;
  const compareAt = product.compare_at_price_cents;
  const discount = compareAt ? getDiscountPercent(currentPrice, compareAt) : null;
  const onSale = discount !== null && discount > 0;
  const selectionReady = structured
    ? isSelectionComplete(product.option_groups, selection, variants.length)
    : selected !== null;

  function handleSelectionChange(next: VariantSelection) {
    setSelection(next);
    onColorChange?.(next.color ?? null);
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          {wholesalePrice != null ? (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Розница:{" "}
                  <span className="font-medium text-foreground">
                    {formatPrice(currentPrice, product.currency)}
                  </span>
                </span>
                <span>
                  Опт:{" "}
                  <span className="store-price-sale text-lg font-semibold">
                    {formatPrice(wholesalePrice, product.currency)}
                  </span>
                </span>
              </div>
            </div>
          ) : onSale && compareAt ? (
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

        {selected?.sku ? (
          <p className="text-sm text-muted-foreground">Артикул: {selected.sku}</p>
        ) : null}

        {inStock ? (
          <span className="inline-flex w-fit items-center rounded-full bg-store-success px-2.5 py-1 text-sm font-medium text-store-success-foreground">
            В наличии
          </span>
        ) : (
          <span className="inline-flex w-fit items-center rounded-full bg-store-muted-badge px-2.5 py-1 text-sm font-medium text-store-muted-badge-foreground">
            Нет в наличии
          </span>
        )}

        {structured ? (
          <VariantSelector
            optionGroups={product.option_groups}
            variants={variants}
            selection={selection}
            onSelectionChange={handleSelectionChange}
          />
        ) : variants.length > 0 ? (
          <FlatVariantSelector
            variants={variants}
            selectedId={flatSelectedId}
            onSelect={setFlatSelectedId}
          />
        ) : null}

        {selected && selectionReady ? (
          <AddToCartButton
            variantId={selected.id}
            productName={product.name}
            disabled={!inStock}
            size="lg"
            className="w-full sm:w-auto sm:min-w-48"
            label="В корзину"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Выберите доступный вариант товара.
          </p>
        )}
      </div>

      <div id="product-purchase-sentinel" className="h-px w-full" aria-hidden />

      <ProductStickyBar
        product={product}
        selectedVariantId={selected?.id ?? null}
        inStock={inStock}
      />
    </>
  );
}
