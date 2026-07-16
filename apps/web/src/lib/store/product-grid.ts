import type { Product } from "@/lib/api";
import type { ProductGridItem } from "@/components/store/catalog/product-grid";

function defaultVariant(product: Product) {
  return product.variants.find((v) => v.is_default) ?? product.variants[0];
}

export function toProductGridItems(
  products: Product[],
  isWholesaler: boolean,
): ProductGridItem[] {
  return products.map((product) => {
    const variant = defaultVariant(product);
    const wholesalePriceCents =
      isWholesaler && variant?.wholesale_price_cents != null
        ? variant.wholesale_price_cents
        : undefined;

    return {
      name: product.name,
      slug: product.slug,
      price_cents: product.price_cents,
      currency: product.currency,
      in_stock: product.in_stock,
      compareAtCents: product.compare_at_price_cents ?? undefined,
      imageSrc: product.image_url ?? undefined,
      isWholesaler: wholesalePriceCents != null,
      wholesalePriceCents,
      defaultVariantId: variant?.id,
    };
  });
}
