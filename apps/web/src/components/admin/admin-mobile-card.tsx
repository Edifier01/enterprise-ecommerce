import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AdminDesktopTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hidden overflow-x-auto rounded-lg border border-border md:block", className)}>
      {children}
    </div>
  );
}

export function AdminMobileCardList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ul className={cn("space-y-3 md:hidden", className)}>{children}</ul>;
}

export function AdminMobileCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm ring-1 ring-foreground/5",
        className,
      )}
    >
      {children}
    </li>
  );
}

export function AdminMobileCardRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 text-sm", className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground">{children}</span>
    </div>
  );
}
