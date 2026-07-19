import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/store/catalog/product-detail";
import { ProductJsonLd } from "@/components/store/catalog/product-json-ld";
import { RelatedProducts } from "@/components/store/catalog/related-products";
import { PageContainer } from "@/components/store/layout/page-container";
import { getAccessToken, getCurrentUser } from "@/lib/auth/session";
import { getCategories, getProduct, listProducts } from "@/lib/api";
import { toProductGridItems } from "@/lib/store/product-grid";
import { siteConfig } from "@/lib/store/site-config";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getProduct(slug);
    const title = product.meta_title?.trim() || product.name;
    const description =
      product.meta_description?.trim() ||
      product.description?.trim() ||
      `${product.name} — купить в ${siteConfig.name}`;
    return {
      title,
      description,
    };
  } catch {
    return { title: "Товар не найден" };
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const token = await getAccessToken();
  const user = await getCurrentUser();
  const isWholesaler = user?.is_wholesaler ?? false;

  let product: Awaited<ReturnType<typeof getProduct>>;
  try {
    product = await getProduct(slug, token);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return notFound();
    }
    throw error;
  }

  let categoryBreadcrumb: { name: string; href: string } | undefined;
  let relatedProducts: ReturnType<typeof toProductGridItems> = [];

  if (product.category_id) {
    try {
      const categories = await getCategories();
      const category = categories.items.find((item) => item.id === product.category_id);
      if (category) {
        categoryBreadcrumb = {
          name: category.name,
          href: `/catalog/${category.slug}`,
        };

        const related = await listProducts(1, 5, category.slug, token, {
          in_stock: true,
          sort: "default",
        });
        relatedProducts = toProductGridItems(
          related.items.filter((item) => item.slug !== product.slug).slice(0, 4),
          isWholesaler,
        );
      }
    } catch {
      // Optional enrichment when API is unavailable
    }
  }

  const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/products/${product.slug}`;

  return (
    <PageContainer as="div" className="space-y-10">
      <ProductJsonLd product={product} productUrl={productUrl} />
      <ProductDetail
        product={product}
        isWholesaler={isWholesaler}
        categoryBreadcrumb={categoryBreadcrumb}
      />
      <RelatedProducts
        products={relatedProducts}
        categoryHref={categoryBreadcrumb?.href}
        categoryName={categoryBreadcrumb?.name}
      />
    </PageContainer>
  );
}
