import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";

import { CatalogSearchForm } from "@/components/store/catalog/catalog-search-form";
import { CartHeaderSummary } from "@/components/store/layout/cart-header-summary";
import { MobileCategoryDrawer } from "@/components/store/layout/mobile-category-drawer";
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
  const accountHref = user ? "/account" : "/login";

  return (
    <div className="bg-background">
      <div className={siteConfig.layout.containerClass}>
        <div className="flex flex-col gap-2.5 py-2.5 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-6 md:py-4">
          <div className="flex items-center gap-2 md:contents">
            <MobileCategoryDrawer navItems={navItems} tree={categoryTree} />
            <Link
              href="/"
              className="flex min-w-0 flex-1 items-center gap-2 text-lg font-bold uppercase tracking-wide text-primary md:flex-none md:text-xl"
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
            <div className="flex shrink-0 items-center gap-2 sm:gap-4 md:col-start-3 md:justify-end">
              <Link
                href={accountHref}
                className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground transition-colors hover:text-primary sm:text-sm"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="size-4" aria-hidden />
                </span>
                <span className="hidden sm:inline">Личный кабинет</span>
              </Link>
              <CartHeaderSummary />
            </div>
          </div>

          <div className="min-w-0 md:col-start-2 md:max-w-2xl md:justify-self-center lg:max-w-3xl">
            <CatalogSearchForm variant="header" />
          </div>
        </div>
      </div>
    </div>
  );
}
