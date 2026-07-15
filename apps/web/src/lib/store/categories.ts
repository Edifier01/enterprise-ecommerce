import type { BreadcrumbItem } from "@/components/store/catalog/breadcrumbs";

export type CategoryDefinition = {
  slug: string;
  name: string;
  description?: string;
  parentSlug?: string;
};

/**
 * Static category tree retained as an offline fallback for the storefront.
 *
 * The catalog now fetches live categories from the API (Sprint 7) and filters
 * products by their real primary-category FK (Sprint 8 / ADR-002). These
 * definitions are only used when the API is unreachable.
 */
export const categories: CategoryDefinition[] = [
  {
    slug: "snaryazhenie",
    name: "Снаряжение",
    description: "Разгрузки, рюкзаки, подсумки",
  },
  {
    slug: "odezhda",
    name: "Тактическая одежда",
    description: "Куртки, термобельё, мембрана",
  },
  {
    slug: "obuv",
    name: "Обувь",
    description: "Ботинки, берцы, тактические кроссовки",
  },
  {
    slug: "aksessuary",
    name: "Аксессуары",
    description: "Фонари, IFAK, ножи, оптика",
  },
];

export function getCategoryBySlug(slug: string): CategoryDefinition | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getRootCategories(): CategoryDefinition[] {
  return categories.filter((category) => !category.parentSlug);
}

export function getAllCategorySlugs(): string[] {
  return categories.map((category) => category.slug);
}

export function getBreadcrumbsForCategory(slug: string): BreadcrumbItem[] {
  const category = getCategoryBySlug(slug);

  if (!category) {
    return [{ label: "Каталог", href: "/catalog" }];
  }

  const items: BreadcrumbItem[] = [
    { label: "Главная", href: "/" },
    { label: "Каталог", href: "/catalog" },
  ];

  if (category.parentSlug) {
    const parent = getCategoryBySlug(category.parentSlug);
    if (parent) {
      items.push({ label: parent.name, href: `/catalog/${parent.slug}` });
    }
  }

  items.push({ label: category.name });

  return items;
}
