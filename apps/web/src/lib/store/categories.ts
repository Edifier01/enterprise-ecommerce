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
    slug: "elektronika",
    name: "Электроника",
    description: "Гаджеты, аксессуары и техника для дома",
  },
  {
    slug: "odezhda",
    name: "Одежда",
    description: "Повседневная и сезонная одежда",
  },
  {
    slug: "odezhda-muzhskaya",
    name: "Мужская одежда",
    description: "Куртки, брюки, футболки",
    parentSlug: "odezhda",
  },
  {
    slug: "odezhda-zhenskaya",
    name: "Женская одежда",
    description: "Платья, блузы, верхняя одежда",
    parentSlug: "odezhda",
  },
  {
    slug: "dom-i-sad",
    name: "Дом и сад",
    description: "Товары для дома, декор и садовый инвентарь",
  },
  {
    slug: "sport",
    name: "Спорт и отдых",
    description: "Экипировка и товары для активного образа жизни",
  },
  {
    slug: "krasota",
    name: "Красота и здоровье",
    description: "Уход, косметика и гигиена",
  },
  {
    slug: "detskie-tovary",
    name: "Детские товары",
    description: "Одежда, игрушки и товары для детей",
  },
  {
    slug: "avto",
    name: "Авто",
    description: "Аксессуары и расходники для автомобиля",
  },
  {
    slug: "knigi",
    name: "Книги",
    description: "Художественная и деловая литература",
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
