import { getCategories } from "@/lib/api";
import type { Category } from "@/lib/api";
import { allowStaticCategoryFallback } from "@/lib/store/category-fallback";
import { getRootCategories } from "@/lib/store/categories";
import { siteConfig } from "@/lib/store/site-config";

export type HeaderCategory = {
  slug: string;
  name: string;
  href?: string;
};

export type HeaderCategoryNode = HeaderCategory & {
  id?: string;
  children: HeaderCategory[];
};

export type HeaderCategoryData = {
  navItems: HeaderCategory[];
  tree: HeaderCategoryNode[];
  usedStaticFallback: boolean;
};

const HOME_NAV_ITEM: HeaderCategory = { slug: "novinki", name: "Новинки", href: "/" };

function emptyHeaderData(): HeaderCategoryData {
  return {
    tree: [],
    navItems: [HOME_NAV_ITEM],
    usedStaticFallback: false,
  };
}

function mapStaticTree(): HeaderCategoryData {
  const roots = getRootCategories().map((category) => ({
    slug: category.slug,
    name: category.name,
    children: getStaticSubLinks(category.slug),
  }));

  return {
    tree: roots,
    navItems: [HOME_NAV_ITEM, ...roots.filter((category) => category.slug !== "novinki")],
    usedStaticFallback: true,
  };
}

function getStaticSubLinks(slug: string): HeaderCategory[] {
  const links = siteConfig.categorySubLinks[slug];
  if (!links) {
    return [];
  }

  return links.map((link) => ({
    slug: link.slug,
    name: link.label,
    href: link.href,
  }));
}

function mapApiTree(items: Category[]): HeaderCategoryData {
  const active = items.filter((category) => category.is_active);
  const roots = active
    .filter((category) => category.parent_id === null)
    .sort((left, right) => left.sort_order - right.sort_order);

  const tree: HeaderCategoryNode[] = roots.map((root) => {
    const children = active
      .filter((category) => category.parent_id === root.id)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((child) => ({
        slug: child.slug,
        name: child.name,
        href: `/catalog/${child.slug}`,
      }));

    const fallbackChildren = allowStaticCategoryFallback() ? getStaticSubLinks(root.slug) : [];

    return {
      id: root.id,
      slug: root.slug,
      name: root.name,
      href: `/catalog/${root.slug}`,
      children: children.length > 0 ? children : fallbackChildren,
    };
  });

  return {
    tree,
    navItems: [HOME_NAV_ITEM, ...tree.filter((category) => category.slug !== "novinki")],
    usedStaticFallback: false,
  };
}

export async function getHeaderCategoryData(): Promise<HeaderCategoryData> {
  try {
    const response = await getCategories();
    if (response.items.length === 0) {
      return allowStaticCategoryFallback() ? mapStaticTree() : emptyHeaderData();
    }
    return mapApiTree(response.items);
  } catch {
    return allowStaticCategoryFallback() ? mapStaticTree() : emptyHeaderData();
  }
}

/** @deprecated Use getHeaderCategoryData */
export async function getHeaderCategories(): Promise<HeaderCategory[]> {
  const data = await getHeaderCategoryData();
  return data.navItems;
}
