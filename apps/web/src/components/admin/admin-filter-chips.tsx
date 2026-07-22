import Link from "next/link";

import { cn } from "@/lib/utils";

export type AdminFilterChipItem = {
  label: string;
  href: string;
  active?: boolean;
  count?: number;
};

type AdminFilterChipsProps = {
  items: AdminFilterChipItem[];
  resetHref?: string;
  resetLabel?: string;
  className?: string;
};

export function AdminFilterChips({
  items,
  resetHref,
  resetLabel = "Сбросить",
  className,
}: AdminFilterChipsProps) {
  const hasActiveFilter = items.some((item) => item.active);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          aria-current={item.active ? "true" : undefined}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            item.active
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
          )}
        >
          {item.label}
          {item.count != null ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs",
                item.active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
              )}
            >
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
      {resetHref && hasActiveFilter ? (
        <Link
          href={resetHref}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {resetLabel}
        </Link>
      ) : null}
    </div>
  );
}
