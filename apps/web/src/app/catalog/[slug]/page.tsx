import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import type { BreadcrumbItem } from "@/components/store/catalog/breadcrumbs";
import { CategoryFallbackNotice } from "@/components/store/catalog/category-fallback-notice";
import { CategoryGrid } from "@/components/store/catalog/category-grid";
import { CategoryProductList } from "@/components/store/catalog/category-product-list";
import { PageContainer } from "@/components/store/layout/page-container";
import { StoreErrorState } from "@/components/store/ui/store-error-state";
import { getCategories, getProductFacets, listProducts } from "@/lib/api";
import type { Category } from "@/lib/api";
import { getAccessToken, getCurrentUser } from "@/lib/auth/session";
import { allowStaticCategoryFallback } from "@/lib/store/category-fallback";
import {
  getAllCategorySlugs,
  getBreadcrumbsForCategory,
  getCategoryBySlug,
} from "@/lib/store/categories";
import {
  apiFacetsToCatalogFacets,
  catalogQueryToApiParams,
  catalogQueryToFacetParams,
  parseCatalogSearchParams,
} from "@/lib/store/catalog-query";
import { toProductGridItems } from "@/lib/store/product-grid";
import { siteConfig } from "@/lib/store/site-config";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

function buildApiBreadcrumbs(slug: string, all: Category[]): BreadcrumbItem[] {
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

function resolveCategoryFromApiOrFallback(
  slug: string,
  apiCategories: Awaited<ReturnType<typeof getCategories>> | null,
  categoriesFailed: boolean,
) {
  const apiCategory = apiCategories?.items.find((c) => c.slug === slug) ?? null;
  if (apiCategory) {
    return { category: apiCategory, usedStaticFallback: false };
  }

  if (categoriesFailed || apiCategories === null) {
    if (allowStaticCategoryFallback()) {
      const staticCategory = getCategoryBySlug(slug);
      if (staticCategory) {
        return { category: staticCategory, usedStaticFallback: true };
      }
    }
    return { category: null, usedStaticFallback: false };
  }

  return { category: null, usedStaticFallback: false };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  let apiCategories: Awaited<ReturnType<typeof getCategories>> | null = null;
  let categoriesFailed = false;
  try {
    apiCategories = await getCategories();
  } catch {
    categoriesFailed = true;
  }

  const { category } = resolveCategoryFromApiOrFallback(slug, apiCategories, categoriesFailed);

  if (!category) {
    return { title: "Раздел не найден" };
  }

  return {
    title: category.name,
    description:
      category.description ?? `Товары в разделе «${category.name}» — ${siteConfig.name}`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const catalogQuery = parseCatalogSearchParams(resolvedSearchParams);
  const token = await getAccessToken();
  const user = await getCurrentUser();
  const isWholesaler = user?.is_wholesaler ?? false;

  let apiCategories: Awaited<ReturnType<typeof getCategories>> | null = null;
  let categoriesFailed = false;
  try {
    apiCategories = await getCategories();
  } catch {
    categoriesFailed = true;
  }

  const { category, usedStaticFallback } = resolveCategoryFromApiOrFallback(
    slug,
    apiCategories,
    categoriesFailed,
  );

  if (!category) {
    notFound();
  }

  const apiCategory = apiCategories?.items.find((c) => c.slug === slug) ?? null;

  let products: Awaited<ReturnType<typeof listProducts>> | null = null;
  let facets: Awaited<ReturnType<typeof getProductFacets>> | null = null;
  let error: string | null = null;

  try {
    const apiFilters = catalogQueryToApiParams(catalogQuery, {
      categorySlug: slug,
      limit: 48,
    });
    products = await listProducts(catalogQuery.page, 48, slug, token, apiFilters);
    facets = await getProductFacets(
      {
        categorySlug: slug,
        filters: catalogQueryToFacetParams(catalogQuery, { categorySlug: slug }),
      },
      token,
    );
  } catch {
    error =
      "Не удалось загрузить товары. Убедитесь, что API запущен и доступен.";
  }

  const allCategories = apiCategories?.items ?? [];
  const childCategories =
    apiCategory !== null ? allCategories.filter((c) => c.parent_id === apiCategory.id) : [];
  const categoryProducts = toProductGridItems(products?.items ?? [], isWholesaler);
  const catalogFacets = facets
    ? apiFacetsToCatalogFacets(facets)
    : {
        sizes: [],
        colors: [],
        priceRange: { min: 0, max: 0 },
        sizeCounts: {},
        colorCounts: {},
      };

  const childCategoryCards = childCategories.map((child) => ({
    slug: child.slug,
    name: child.name,
    description: child.description ?? undefined,
    productCount: child.product_count,
  }));

  const breadcrumbs =
    apiCategories !== null && apiCategory !== null
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

      {usedStaticFallback ? <CategoryFallbackNotice /> : null}

      {error ? (
        <StoreErrorState
          title="Не удалось загрузить товары"
          description={error}
          action={{ label: "В каталог", href: "/catalog" }}
        />
      ) : null}

      {childCategoryCards.length > 0 ? (
        <section aria-labelledby="subcategories-heading" className="space-y-4">
          <h2 id="subcategories-heading" className="text-lg font-semibold">
            Подразделы
          </h2>
          <CategoryGrid categories={childCategoryCards} />
        </section>
      ) : null}

      {!error ? (
        <section aria-labelledby="category-products-heading" className="space-y-4">
          <h2 id="category-products-heading" className="text-lg font-semibold">
            Товары раздела
          </h2>
          <CategoryProductList
            products={categoryProducts}
            total={products?.total ?? 0}
            facets={catalogFacets}
            query={catalogQuery}
          />
        </section>
      ) : null}
    </PageContainer>
  );
}
