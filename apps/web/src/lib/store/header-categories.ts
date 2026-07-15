import { getCategories } from "@/lib/api";
import type { Category } from "@/lib/api";
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
};

function mapStaticTree(): HeaderCategoryData {
  const roots = getRootCategories().map((category) => ({
    slug: category.slug,
    name: category.name,
    children: getStaticSubLinks(category.slug),
  }));

  return {
    tree: roots,
    navItems: [
      { slug: "novinki", name: "Новинки", href: "/" },
      ...roots.filter((category) => category.slug !== "novinki"),
    ],
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

    const fallbackChildren = getStaticSubLinks(root.slug);

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
    navItems: [
      { slug: "novinki", name: "Новинки", href: "/" },
      ...tree.filter((category) => category.slug !== "novinki"),
    ],
  };
}

export async function getHeaderCategoryData(): Promise<HeaderCategoryData> {
  try {
    const response = await getCategories();
    if (response.items.length === 0) {
      return mapStaticTree();
    }
    return mapApiTree(response.items);
  } catch {
    return mapStaticTree();
  }
}

/** @deprecated Use getHeaderCategoryData */
export async function getHeaderCategories(): Promise<HeaderCategory[]> {
  const data = await getHeaderCategoryData();
  return data.navItems;
}
