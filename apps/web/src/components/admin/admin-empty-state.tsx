import Link from "next/link";

import { cn } from "@/lib/utils";

type AdminEmptyStateProps = {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
};

export function AdminEmptyState({
  title,
  description,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
