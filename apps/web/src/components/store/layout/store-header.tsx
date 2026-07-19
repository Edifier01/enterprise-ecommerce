import { CategoryMegaMenuNav } from "@/components/store/layout/category-mega-menu";
import { MainHeader } from "@/components/store/layout/main-header";
import { TopBar } from "@/components/store/layout/top-bar";
import { TrustBar } from "@/components/store/layout/trust-bar";
import { getHeaderCategoryData } from "@/lib/store/header-categories";
import { siteConfig } from "@/lib/store/site-config";

/**
 * Storefront header (stich.su-inspired structure):
 * Row 1 — utility links (scrolls away, desktop only)
 * Row 1b — trust / USP strip (scrolls away, desktop only)
 * Rows 2–3 — logo + search + account/cart + categories (sticky)
 */
export async function StoreHeader() {
  const categoryData = await getHeaderCategoryData();

  return (
    <header>
      <div className="hidden md:block">
        <TopBar />
        <TrustBar />
      </div>
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <MainHeader
          navItems={categoryData.navItems}
          categoryTree={categoryData.tree}
        />
        <CategoryNavBar
          navItems={categoryData.navItems}
          categoryTree={categoryData.tree}
        />
      </div>
    </header>
  );
}

async function CategoryNavBar({
  navItems,
  categoryTree,
}: {
  navItems: Awaited<ReturnType<typeof getHeaderCategoryData>>["navItems"];
  categoryTree: Awaited<ReturnType<typeof getHeaderCategoryData>>["tree"];
}) {
  return (
    <div className="hidden bg-background md:block">
      <div className={siteConfig.layout.containerClass}>
        <CategoryMegaMenuNav navItems={navItems} tree={categoryTree} />
      </div>
    </div>
  );
}
