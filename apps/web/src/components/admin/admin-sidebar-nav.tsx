"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { filterAdminNavSections, isAdminNavActive } from "@/lib/admin/navigation";
import { cn } from "@/lib/utils";

export function AdminSidebarNav({
  permissions,
  onNavigate,
  className,
}: {
  permissions: readonly string[];
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const sections = filterAdminNavSections(permissions);

  return (
    <nav className={cn("flex flex-1 flex-col gap-5 px-2 py-3", className)}>
      {sections.map((section) => (
        <div key={section.title ?? "root"} className="flex flex-col gap-0.5">
          {section.title ? (
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {section.title}
            </p>
          ) : null}
          {section.items.map((item) => {
            const active = isAdminNavActive(pathname, item.href, item.exact);
            const isPrimary = item.tier === "primary";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "relative flex min-h-10 w-full items-center rounded-md px-3 py-2 transition-colors",
                  isPrimary ? "admin-nav-primary" : "admin-nav-secondary",
                  isPrimary && "border-l-2 border-transparent",
                  active
                    ? isPrimary
                      ? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                      : "bg-sidebar-accent/70 text-sidebar-foreground"
                    : isPrimary
                      ? "hover:bg-sidebar-accent/50"
                      : "hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
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
