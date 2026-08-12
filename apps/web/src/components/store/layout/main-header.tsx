import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";

import { CategoryMegaMenuNav } from "@/components/store/layout/category-mega-menu";
import {
  MainHeaderSearchPanel,
  MainHeaderSearchToggle,
  MobileSearchProvider,
} from "@/components/store/layout/main-header-search";
import { CartHeaderSummary } from "@/components/store/layout/cart-header-summary";
import { MobileCategoryDrawer } from "@/components/store/layout/mobile-category-drawer";
import { isStorefrontAuthUiEnabled } from "@/lib/auth/storefront-auth";
import { getCurrentUser } from "@/lib/auth/session";
import type {
  HeaderCategory,
  HeaderCategoryNode,
} from "@/lib/store/header-categories";
import { siteConfig } from "@/lib/store/site-config";

export async function MainHeader({
  navItems,
  categoryTree,
}: {
  navItems: HeaderCategory[];
  categoryTree: HeaderCategoryNode[];
}) {
  const user = await getCurrentUser();
  const authUiEnabled = isStorefrontAuthUiEnabled();
  const showAccountLink = Boolean(user) || authUiEnabled;
  const accountHref = user ? "/account" : "/login";
  /** Category roots only — primary commerce links live in siteConfig.primaryNav. */
  const categoryNavItems = categoryTree.filter((node) => node.slug !== "novinki");

  return (
    <MobileSearchProvider>
      <div className="bg-background">
        <div className={siteConfig.layout.containerClass}>
          <div className="flex flex-col gap-2 py-2 md:py-2.5">
            <div className="flex items-center gap-2 md:gap-3">
              <MobileCategoryDrawer navItems={navItems} tree={categoryTree} />

              <Link
                href="/"
                className="flex min-w-0 shrink-0 items-center gap-2 text-lg font-bold uppercase tracking-wide text-primary md:text-xl"
              >
                <Image
                  src={siteConfig.images.logo}
                  alt=""
                  width={40}
                  height={40}
                  className="size-9 shrink-0 rounded-sm object-cover sm:size-10"
                  priority
                />
                <span className="truncate">{siteConfig.name}</span>
              </Link>

              <nav
                aria-label="Основная навигация"
                className="hidden shrink-0 items-center gap-0.5 md:flex"
              >
                {siteConfig.primaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex min-h-10 items-center rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary lg:px-2.5"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden min-w-0 flex-1 overflow-hidden lg:block">
                {categoryNavItems.length > 0 ? (
                  <CategoryMegaMenuNav
                    navItems={categoryNavItems}
                    tree={categoryTree}
                  />
                ) : null}
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                <MainHeaderSearchToggle />
                {showAccountLink ? (
                  <Link
                    href={accountHref}
                    className="inline-flex min-h-11 items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground transition-colors hover:text-primary sm:text-sm"
                  >
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-9">
                      <User className="size-4" aria-hidden />
                    </span>
                    <span className="hidden xl:inline">Личный кабинет</span>
                  </Link>
                ) : null}
                <CartHeaderSummary />
              </div>
            </div>

            {/* md: categories when not shown inline beside primary nav */}
            <div className="hidden min-w-0 md:block lg:hidden">
              {categoryNavItems.length > 0 ? (
                <CategoryMegaMenuNav
                  navItems={categoryNavItems}
                  tree={categoryTree}
                />
              ) : null}
            </div>

            <MainHeaderSearchPanel />
          </div>
        </div>
      </div>
    </MobileSearchProvider>
  );
}
