import { getCategories } from "@/lib/api";
import { getRootCategories } from "@/lib/store/categories";
import { siteConfig } from "@/lib/store/site-config";

import { CategoryNavLinks } from "./category-nav-links";

export async function CategoryNavBar() {
  let categories = getRootCategories().map((category) => ({
    slug: category.slug,
    name: category.name,
  }));

  try {
    const response = await getCategories();
    const apiRoots = response.items
      .filter((category) => category.parent_id === null && category.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((category) => ({
        slug: category.slug,
        name: category.name,
      }));

    if (apiRoots.length > 0) {
      categories = apiRoots;
    }
  } catch {
    // Keep static fallback when API is unavailable.
  }

  const navItems = [
    { slug: "novinki", name: "Новинки", href: "/" as const },
    ...categories.filter((category) => category.slug !== "novinki"),
  ];

  return (
    <div className="hidden bg-background md:block">
      <div className={siteConfig.layout.containerClass}>
        <CategoryNavLinks categories={navItems} />
      </div>
    </div>
  );
}
