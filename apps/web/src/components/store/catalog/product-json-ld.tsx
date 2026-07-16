import type { Product } from "@/lib/api";
import { siteConfig } from "@/lib/store/site-config";

type ProductJsonLdProps = {
  product: Product;
  productUrl: string;
};

export function ProductJsonLd({ product, productUrl }: ProductJsonLdProps) {
  const variant = product.variants.find((item) => item.is_default) ?? product.variants[0];
  const sku = variant?.sku ?? product.slug;
  const hasSale =
    product.compare_at_price_cents != null &&
    product.compare_at_price_cents > product.price_cents;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.image_url ?? siteConfig.images.productPlaceholder,
    sku,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: product.currency,
      price: (product.price_cents / 100).toFixed(2),
      availability: product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      ...(hasSale
        ? {
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10),
          }
        : {}),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
