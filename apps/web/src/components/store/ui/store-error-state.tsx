import Link from "next/link";

import { cn } from "@/lib/utils";

type StoreErrorStateProps = {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  onRetry?: () => void;
  className?: string;
};

export function StoreErrorState({
  title,
  description,
  action,
  onRetry,
  className,
}: StoreErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center",
        className,
      )}
      role="alert"
    >
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Повторить
          </button>
        ) : null}
        {action ? (
          <Link
            href={action.href}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
