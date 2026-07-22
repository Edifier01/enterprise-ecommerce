import Link from "next/link";

import { cn } from "@/lib/utils";

export type AdminSavedView = {
  id: string;
  label: string;
  href: string;
  count?: number;
};

type AdminSavedViewsProps = {
  views: AdminSavedView[];
  activeId: string;
  className?: string;
};

export function AdminSavedViews({ views, activeId, className }: AdminSavedViewsProps) {
  return (
    <nav
      aria-label="Сохранённые представления"
      className={cn("flex flex-wrap gap-1 border-b border-border", className)}
    >
      {views.map((view) => {
        const active = view.id === activeId;
        return (
          <Link
            key={view.id}
            href={view.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {view.label}
            {view.count != null ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  active ? "bg-muted text-foreground" : "bg-muted/70 text-muted-foreground",
                )}
              >
                {view.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
