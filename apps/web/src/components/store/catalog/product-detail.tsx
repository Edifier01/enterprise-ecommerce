"use client";

import { useMemo, useState } from "react";

import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import type { BreadcrumbItem } from "@/components/store/catalog/breadcrumbs";
import { ProductGallery } from "@/components/store/catalog/product-gallery";
import {
  ProductDeliveryInfo,
  ProductTrustBlock,
} from "@/components/store/catalog/product-info-sections";
import { ProductPurchasePanel } from "@/components/store/catalog/product-purchase-panel";
import {
  ProductSpecsTable,
  buildProductSpecRows,
} from "@/components/store/catalog/product-specs-table";
import type { Product, ProductImage } from "@/lib/api";
import { siteConfig } from "@/lib/store/site-config";
import { resolveProductGalleryImageSrc } from "@/lib/store/product-image";
import { pickDefaultSelection, usesStructuredSelector } from "@/lib/store/variant-options";

export interface ProductDetailProps {
  product: Product;
  isWholesaler?: boolean;
  categoryBreadcrumb?: { name: string; href: string };
  previewToken?: string;
}

function withPreviewQuery(src: string, previewToken?: string): string {
  if (!previewToken || !src.includes("/erp-image")) {
    return src;
  }
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}preview=${encodeURIComponent(previewToken)}`;
}

function buildGalleryImages(
  product: Product,
  selectedColor: string | null,
  previewToken?: string,
): { src: string; alt: string }[] {
  const placeholder = siteConfig.images.productPlaceholder;
  const fallback = resolveProductGalleryImageSrc(product.slug, product.image_url ?? placeholder);

  const tagged =
    selectedColor != null
      ? product.images.filter(
          (image) =>
            image.option_color &&
            image.option_color.toLowerCase() === selectedColor.toLowerCase(),
        )
      : [];

  const general = product.images.filter((image) => !image.option_color);
  const ordered: ProductImage[] =
    tagged.length > 0 ? tagged : general.length > 0 ? general : product.images;

  if (ordered.length === 0) {
    return [{ src: withPreviewQuery(fallback, previewToken), alt: product.name }];
  }

  return ordered.map((image, index) => ({
    src: withPreviewQuery(resolveProductGalleryImageSrc(product.slug, image.url), previewToken),
    alt: image.alt_text?.trim() || `${product.name} — фото ${index + 1}`,
  }));
}

export function ProductDetail({
  product,
  isWholesaler = false,
  categoryBreadcrumb,
  previewToken,
}: ProductDetailProps) {
  const structured = usesStructuredSelector(product.option_groups, product.variants.length);
  const initialColor = structured
    ? pickDefaultSelection(product.variants, product.option_groups).color ?? null
    : null;
  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);

  const galleryImages = useMemo(
    () => buildGalleryImages(product, selectedColor, previewToken),
    [product, selectedColor, previewToken],
  );

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Главная", href: "/" },
    { label: "Каталог", href: "/catalog" },
  ];

  if (categoryBreadcrumb) {
    breadcrumbs.push({
      label: categoryBreadcrumb.name,
      href: categoryBreadcrumb.href,
    });
  }

  breadcrumbs.push({ label: product.name });

  const description = product.description?.trim();
  const specRows = buildProductSpecRows(product);
  const showSpecs =
    product.variants.length > 1 ||
    specRows.some((row) => row.label !== "Наличие");

  return (
    <div className="space-y-8 sm:space-y-10">
      <Breadcrumbs items={breadcrumbs} />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={galleryImages} productSlug={product.slug} />

        <div className="flex flex-col gap-5">
          <header className="space-y-2">
            <h1 className="store-section-title text-2xl sm:text-3xl">{product.name}</h1>
          </header>

          <ProductPurchasePanel
            product={product}
            isWholesaler={isWholesaler}
            onColorChange={(color) => {
              setSelectedColor(color);
            }}
          />

          {description ? (
            <section aria-labelledby="product-description-heading" className="space-y-2 border-t pt-5">
              <h2 id="product-description-heading" className="text-sm font-semibold text-foreground">
                Описание
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </section>
          ) : (
            <p className="border-t pt-5 text-sm text-muted-foreground">Описание уточняется.</p>
          )}
        </div>
      </div>

      <div className="space-y-8 border-t pt-8">
        {showSpecs ? (
          <section aria-labelledby="product-specs-heading" className="space-y-3">
            <h2 id="product-specs-heading" className="text-sm font-semibold text-foreground">
              Характеристики
            </h2>
            <ProductSpecsTable product={product} />
          </section>
        ) : null}

        <ProductDeliveryInfo />
        <ProductTrustBlock />
      </div>
    </div>
  );
}
