"use client";

import { ProductThumbnail } from "@/components/store/catalog/product-thumbnail";
import type { CartLine } from "@/lib/checkout/api";
import {
  getCartLineTitle,
  getCartLineVariantLabel,
} from "@/lib/checkout/cart-line-display";
import { cn } from "@/lib/utils";

type CartLinePreviewProps = {
  snapshot: CartLine["product_snapshot"];
  className?: string;
  imageClassName?: string;
  titleClassName?: string;
  variantClassName?: string;
};

export function CartLinePreview({
  snapshot,
  className,
  imageClassName,
  titleClassName,
  variantClassName,
}: CartLinePreviewProps) {
  const title = getCartLineTitle(snapshot);
  const variant = getCartLineVariantLabel(snapshot);

  return (
    <div className={cn("flex min-w-0 gap-3", className)}>
      <div
        className={cn(
          "relative size-16 shrink-0 overflow-hidden rounded-md bg-muted",
          imageClassName,
        )}
      >
        <ProductThumbnail
          src={snapshot.image_url}
          productSlug={snapshot.product_slug}
          alt={title}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium text-foreground", titleClassName)}>{title}</p>
        {variant ? (
          <p className={cn("text-sm text-muted-foreground", variantClassName)}>{variant}</p>
        ) : null}
      </div>
    </div>
  );
}
