"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCartSummary } from "@/lib/checkout/use-cart-summary";
import { mobileNavigation } from "@/lib/store/navigation";
import { shouldShowMobileBottomNav } from "@/lib/store/mobile-layout";
import { cn } from "@/lib/utils";

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCartSummary();

  if (!shouldShowMobileBottomNav(pathname)) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Мобильная навигация"
    >
      <ul className="grid h-16 grid-cols-5">
        {mobileNavigation.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          const showCartBadge = item.href === "/cart" && itemCount > 0;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={
                  showCartBadge
                    ? `${item.label}, товаров: ${itemCount}`
                    : item.label
                }
                className={cn(
                  "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon
                    className={cn("size-5", active && "stroke-[2.5]")}
                    aria-hidden
                  />
                  {showCartBadge ? (
                    <span
                      className={cn(
                        "absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full",
                        "bg-destructive px-0.5 text-[9px] font-bold leading-4 text-destructive-foreground",
                      )}
                      aria-hidden
                    >
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  ) : null}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
