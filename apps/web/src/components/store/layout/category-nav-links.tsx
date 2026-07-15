"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type CategoryNavItem = {
  slug: string;
  name: string;
  href?: string;
};

function isItemActive(pathname: string, item: CategoryNavItem): boolean {
  if (item.href === "/" || item.slug === "novinki") {
    return pathname === "/";
  }

  return (
    pathname === `/catalog/${item.slug}` ||
    pathname.startsWith(`/catalog/${item.slug}/`)
  );
}

function getItemHref(item: CategoryNavItem): string {
  return item.href ?? `/catalog/${item.slug}`;
}

export function CategoryNavLinks({ categories }: { categories: CategoryNavItem[] }) {
  const pathname = usePathname();

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav
      className="flex items-stretch overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Категории каталога"
    >
      <ul className="flex min-w-full items-stretch">
        {categories.map((category, index) => {
          const active = isItemActive(pathname, category);

          return (
            <li key={category.slug} className="flex shrink-0 items-stretch">
              {index > 0 ? (
                <span
                  className="mx-0.5 w-px self-stretch bg-border sm:mx-1"
                  aria-hidden
                />
              ) : null}
              <Link
                href={getItemHref(category)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors sm:px-4 sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
