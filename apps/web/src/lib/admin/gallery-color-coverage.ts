import type { AdminProduct } from "@/lib/admin/catalog-shared";
import { getColorOptionsFromVariants } from "@/lib/store/variant-options";
import type { ProductVariant } from "@/lib/api";

function toVariantInputs(variants: AdminProduct["variants"]): ProductVariant[] {
  return variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    name: variant.name,
    price_cents: variant.price_cents,
    wholesale_price_cents: variant.wholesale_price_cents ?? undefined,
    in_stock: variant.in_stock,
    is_default: variant.is_default,
    sort_order: variant.sort_order,
    attributes: variant.attributes ?? {},
  }));
}

export type GalleryColorCoverage = {
  colors: string[];
  tagged: string[];
  missing: string[];
  needsColorPhotos: boolean;
};

export function getGalleryColorCoverage(product: AdminProduct): GalleryColorCoverage {
  const colors = getColorOptionsFromVariants(toVariantInputs(product.variants));
  const tagged = [
    ...new Set(
      product.images
        .map((image) => image.option_color)
        .filter((color): color is string => Boolean(color)),
    ),
  ];
  const missing = colors.filter((color) => !tagged.includes(color));
  return {
    colors,
    tagged,
    missing,
    needsColorPhotos: colors.length >= 2 && missing.length > 0,
  };
}

export function galleryCoversAllColors(product: AdminProduct): boolean {
  return !getGalleryColorCoverage(product).needsColorPhotos;
}
