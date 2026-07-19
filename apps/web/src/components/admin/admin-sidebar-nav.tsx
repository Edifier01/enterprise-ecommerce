"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV_SECTIONS, isAdminNavActive } from "@/lib/admin/navigation";
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
    <nav className={cn("flex flex-1 flex-col gap-4 p-3", className)}>
      {ADMIN_NAV_SECTIONS.map((section) => (
        <div key={section.title ?? "root"} className="space-y-1">
          {section.title ? (
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
          ) : null}
          {section.items.map((item) => {
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
        </div>
      ))}
    </nav>
  );
}
