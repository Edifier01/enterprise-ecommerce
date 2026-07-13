import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import type { BreadcrumbItem } from "@/components/store/catalog/breadcrumbs";
import { CategoryGrid } from "@/components/store/catalog/category-grid";
import { CategoryProductList } from "@/components/store/catalog/category-product-list";
import { PageContainer } from "@/components/store/layout/page-container";
import { getCategories, listProducts } from "@/lib/api";
import type { Category } from "@/lib/api";
import { getAccessToken, getCurrentUser } from "@/lib/auth/session";
import {
  getAllCategorySlugs,
  getBreadcrumbsForCategory,
  getCategoryBySlug,
} from "@/lib/store/categories";
import { toProductGridItems } from "@/lib/store/product-grid";
import { siteConfig } from "@/lib/store/site-config";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

function buildApiBreadcrumbs(
  slug: string,
  all: Category[]
): BreadcrumbItem[] {
  const category = all.find((c) => c.slug === slug);
  if (!category) return [{ label: "Каталог", href: "/catalog" }];

  const items: BreadcrumbItem[] = [
    { label: "Главная", href: "/" },
    { label: "Каталог", href: "/catalog" },
  ];

  if (category.parent_id !== null) {
    const parent = all.find((c) => c.id === category.parent_id);
    if (parent) {
      items.push({ label: parent.name, href: `/catalog/${parent.slug}` });
    }
  }

  items.push({ label: category.name });
  return items;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  let apiCategories: Awaited<ReturnType<typeof getCategories>> | null = null;
  try {
    apiCategories = await getCategories();
  } catch {
    // Fall back to static categories
  }

  const category =
    apiCategories?.items.find((c) => c.slug === slug) ??
    getCategoryBySlug(slug);

  if (!category) {
    return { title: "Раздел не найден" };
  }

  return {
    title: category.name,
    description:
      category.description ??
      `Товары в разделе «${category.name}» — ${siteConfig.name}`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const token = await getAccessToken();
  const user = await getCurrentUser();
  const isWholesaler = user?.is_wholesaler ?? false;

  let apiCategories: Awaited<ReturnType<typeof getCategories>> | null = null;
  try {
    apiCategories = await getCategories();
  } catch {
    // Fall back to static categories when API is unavailable
  }

  const apiCategory = apiCategories?.items.find((c) => c.slug === slug) ?? null;
  const category = apiCategory ?? getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  let products: Awaited<ReturnType<typeof listProducts>> | null = null;
  let error: string | null = null;

  try {
    // Filter by the real primary-category association (ADR-002).
    products = await listProducts(1, 48, slug, token);
  } catch {
    error =
      "Не удалось загрузить товары. Убедитесь, что API запущен и доступен.";
  }

  const allCategories = apiCategories?.items ?? [];
  const childCategories =
    apiCategory !== null
      ? allCategories.filter((c) => c.parent_id === apiCategory.id)
      : [];
  const categoryProducts = toProductGridItems(products?.items ?? [], isWholesaler);

  const childCategoryCards = childCategories.map((child) => ({
    slug: child.slug,
    name: child.name,
    description: child.description ?? undefined,
    productCount: 0,
  }));

  const breadcrumbs =
    apiCategories !== null
      ? buildApiBreadcrumbs(slug, apiCategories.items)
      : getBreadcrumbsForCategory(slug);

  return (
    <PageContainer as="div" className="space-y-8 sm:space-y-10">
      <div className="space-y-3">
        <Breadcrumbs items={breadcrumbs} />
        <header className="space-y-2">
          <h1 className="store-section-title">{category.name}</h1>
          {category.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              {category.description}
            </p>
          ) : null}
        </header>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {childCategoryCards.length > 0 ? (
        <section aria-labelledby="subcategories-heading" className="space-y-4">
          <h2 id="subcategories-heading" className="text-lg font-semibold">
            Подразделы
          </h2>
          <CategoryGrid categories={childCategoryCards} />
        </section>
      ) : null}

      <section aria-labelledby="category-products-heading" className="space-y-4">
        <h2 id="category-products-heading" className="text-lg font-semibold">
          Товары раздела
        </h2>
        <p className="text-xs text-muted-foreground">{siteConfig.catalogDisclaimer}</p>
        <CategoryProductList products={categoryProducts} />
      </section>
    </PageContainer>
  );
}
