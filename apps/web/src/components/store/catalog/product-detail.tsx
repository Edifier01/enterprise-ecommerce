import Image from "next/image";

import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import { ProductPurchasePanel } from "@/components/store/catalog/product-purchase-panel";
import type { Product } from "@/lib/api";
import { siteConfig } from "@/lib/store/site-config";

export interface ProductDetailProps {
  product: Product;
  isWholesaler?: boolean;
}

export function ProductDetail({ product, isWholesaler = false }: ProductDetailProps) {
  const placeholder = siteConfig.images.productPlaceholder;

  return (
    <div className="space-y-6 sm:space-y-8">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: "Каталог", href: "/catalog" },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted ring-1 ring-foreground/5">
          <Image
            src={placeholder}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-5">
          <header className="space-y-2">
            <h1 className="store-section-title text-2xl sm:text-3xl">{product.name}</h1>
            <p className="text-sm text-muted-foreground">Артикул: {product.slug}</p>
          </header>

          <ProductPurchasePanel product={product} isWholesaler={isWholesaler} />

          <div className="space-y-2 border-t pt-5">
            <h2 className="text-sm font-semibold text-foreground">Описание</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Подробное описание и характеристики товара появятся после расширения
              каталога. Если нужна консультация по выбору или наличию — напишите на{" "}
              <a
                href={`mailto:${siteConfig.contact.supportEmail}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {siteConfig.contact.supportEmail}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
