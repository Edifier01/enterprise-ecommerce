import Image from "next/image";

import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import type { BreadcrumbItem } from "@/components/store/catalog/breadcrumbs";
import { ProductPurchasePanel } from "@/components/store/catalog/product-purchase-panel";
import { ProductSpecsTable } from "@/components/store/catalog/product-specs-table";
import type { Product } from "@/lib/api";
import { siteConfig } from "@/lib/store/site-config";
import { productImageRenderProps } from "@/lib/store/product-image";

export interface ProductDetailProps {
  product: Product;
  isWholesaler?: boolean;
  categoryBreadcrumb?: { name: string; href: string };
}

function defaultVariant(product: Product) {
  return product.variants.find((variant) => variant.is_default) ?? product.variants[0];
}

export function ProductDetail({
  product,
  isWholesaler = false,
  categoryBreadcrumb,
}: ProductDetailProps) {
  const placeholder = siteConfig.images.productPlaceholder;
  const image = productImageRenderProps(product.image_url ?? placeholder);
  const variant = defaultVariant(product);
  const sku = variant?.sku ?? product.slug;

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
        <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted ring-1 ring-foreground/5">
          <Image
            src={image.src}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            unoptimized={image.unoptimized}
            placeholder={image.placeholder}
            blurDataURL={image.blurDataURL}
          />
        </div>

        <div className="flex flex-col gap-5">
          <header className="space-y-2">
            <h1 className="store-section-title text-2xl sm:text-3xl">{product.name}</h1>
            <p className="text-sm text-muted-foreground">Артикул: {sku}</p>
          </header>

          <ProductPurchasePanel product={product} isWholesaler={isWholesaler} />

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
