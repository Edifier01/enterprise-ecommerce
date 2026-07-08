import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/store/catalog/product-detail";
import { PageContainer } from "@/components/store/layout/page-container";
import { getProduct } from "@/lib/api";
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
    return {
      title: product.name,
      description: `${product.name} — купить в ${siteConfig.name}`,
    };
  } catch {
    return { title: "Товар не найден" };
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;

  let product: Awaited<ReturnType<typeof getProduct>>;
  try {
    product = await getProduct(slug);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return notFound();
    }
    throw error;
  }

  return (
    <PageContainer as="div">
      <ProductDetail product={product} />
    </PageContainer>
  );
}
