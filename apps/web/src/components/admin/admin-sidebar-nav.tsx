"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV_ITEMS, isAdminNavActive } from "@/lib/admin/navigation";
import { cn } from "@/lib/utils";

export function AdminSidebarNav({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-1 flex-col gap-1 p-3", className)}>
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = isAdminNavActive(pathname, item.href, item.exact);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "min-h-11 rounded-md px-3 py-2.5 text-sm font-medium",
              active
                ? "bg-muted text-foreground"
                : "text-foreground hover:bg-muted",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
