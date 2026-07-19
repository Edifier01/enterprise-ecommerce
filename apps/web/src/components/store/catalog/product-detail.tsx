"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import type { BreadcrumbItem } from "@/components/store/catalog/breadcrumbs";
import { ProductPurchasePanel } from "@/components/store/catalog/product-purchase-panel";
import { ProductSpecsTable } from "@/components/store/catalog/product-specs-table";
import type { Product, ProductImage } from "@/lib/api";
import { siteConfig } from "@/lib/store/site-config";
import { productImageRenderProps, resolveProductImageUrl } from "@/lib/store/product-image";
import { pickDefaultSelection, usesStructuredSelector } from "@/lib/store/variant-options";
import { cn } from "@/lib/utils";

export interface ProductDetailProps {
  product: Product;
  isWholesaler?: boolean;
  categoryBreadcrumb?: { name: string; href: string };
}

function buildGalleryImages(
  product: Product,
  selectedColor: string | null,
): { src: string; alt: string }[] {
  const placeholder = siteConfig.images.productPlaceholder;
  const fallback = resolveProductImageUrl(product.image_url ?? placeholder);

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
    return [{ src: fallback, alt: product.name }];
  }

  return ordered.map((image, index) => ({
    src: resolveProductImageUrl(image.url),
    alt: image.alt_text?.trim() || `${product.name} — фото ${index + 1}`,
  }));
}

export function ProductDetail({
  product,
  isWholesaler = false,
  categoryBreadcrumb,
}: ProductDetailProps) {
  const structured = usesStructuredSelector(product.option_groups, product.variants.length);
  const initialColor = structured
    ? pickDefaultSelection(product.variants, product.option_groups).color ?? null
    : null;
  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);

  const galleryImages = useMemo(
    () => buildGalleryImages(product, selectedColor),
    [product, selectedColor],
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const activeImage = galleryImages[Math.min(activeImageIndex, galleryImages.length - 1)];
  const image = productImageRenderProps(activeImage.src);

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

  const description =
    product.description?.trim() ||
    `Тактическое снаряжение с подбором по вашим задачам. Если нужна консультация по совместимости, размеру или комплектации — напишите на ${siteConfig.contact.supportEmail}.`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted ring-1 ring-foreground/5">
            <Image
              src={image.src}
              alt={activeImage.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              unoptimized={image.unoptimized}
              placeholder={image.placeholder}
              blurDataURL={image.blurDataURL}
            />
          </div>

          {galleryImages.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {galleryImages.map((item, index) => {
                const thumb = productImageRenderProps(item.src);
                return (
                  <button
                    key={`${item.src}-${index}`}
                    type="button"
                    aria-label={`Показать фото ${index + 1}`}
                    aria-pressed={index === activeImageIndex}
                    onClick={() => setActiveImageIndex(index)}
                    className={cn(
                      "relative size-16 shrink-0 overflow-hidden rounded-md border",
                      index === activeImageIndex && "border-primary",
                    )}
                  >
                    <Image
                      src={thumb.src}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized={thumb.unoptimized}
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <header className="space-y-2">
            <h1 className="store-section-title text-2xl sm:text-3xl">{product.name}</h1>
          </header>

          <ProductPurchasePanel
            product={product}
            isWholesaler={isWholesaler}
            onColorChange={(color) => {
              setSelectedColor(color);
              setActiveImageIndex(0);
            }}
          />

          <div className="space-y-3 border-t pt-5">
            <h2 className="text-sm font-semibold text-foreground">Характеристики</h2>
            <ProductSpecsTable product={product} />
          </div>

          <div className="space-y-2 border-t pt-5">
            <h2 className="text-sm font-semibold text-foreground">Описание</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
