import type { Product } from "@/lib/api";
import type { ProductGridItem } from "@/components/store/catalog/product-grid";
import { resolveProductImageUrl } from "@/lib/store/product-image";
import {
  extractColorOptions,
  getColorOptionsFromVariants,
  getVariantPriceRange,
  pickDefaultVariant,
  usesStructuredSelector,
} from "@/lib/store/variant-options";

export function toProductGridItems(
  products: Product[],
  isWholesaler: boolean,
): ProductGridItem[] {
  return products.map((product) => {
    const variant = pickDefaultVariant(product.variants);
    const wholesalePriceCents =
      isWholesaler && variant?.wholesale_price_cents != null
        ? variant.wholesale_price_cents
        : undefined;
    const priceRange = getVariantPriceRange(product.variants);
    const colorOptions =
      product.option_groups.length > 0
        ? extractColorOptions(product.option_groups)
        : getColorOptionsFromVariants(product.variants);
    const canQuickAdd =
      product.variants.length === 1 &&
      !usesStructuredSelector(product.option_groups, product.variants.length);

    return {
      name: product.name,
      slug: product.slug,
      price_cents: product.price_cents,
      currency: product.currency,
      in_stock: product.in_stock,
      compareAtCents: product.compare_at_price_cents ?? undefined,
      imageSrc: resolveProductImageUrl(
        product.image_url ?? product.images[0]?.url,
      ),
      isWholesaler: wholesalePriceCents != null,
      wholesalePriceCents,
      defaultVariantId: canQuickAdd ? variant?.id : undefined,
      priceFromCents: priceRange?.min,
      showFromPrice:
        priceRange != null && priceRange.min !== priceRange.max,
      colorOptions,
    };
  });
}
