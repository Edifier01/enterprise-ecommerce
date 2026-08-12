import { MainHeader } from "@/components/store/layout/main-header";
import { TopBar } from "@/components/store/layout/top-bar";
import { getHeaderCategoryData } from "@/lib/store/header-categories";

/**
 * Compact ecommerce header (Corrective UX Phase 2):
 * Row 1 — utility links + phone (desktop)
 * Row 2 — logo + primary nav + categories mega + search + cart (sticky)
 *
 * Trust / USP strip moved to homepage (not a third/fourth header band).
 */
export async function StoreHeader() {
  const categoryData = await getHeaderCategoryData();

  return (
    <header>
      <div className="hidden md:block">
        <TopBar />
      </div>
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <MainHeader
          navItems={categoryData.navItems}
          categoryTree={categoryData.tree}
        />
      </div>
    </header>
  );
}
