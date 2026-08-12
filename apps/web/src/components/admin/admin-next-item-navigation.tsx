import Link from "next/link";

import { cn } from "@/lib/utils";

type AdminNextItemNavigationProps = {
  nextProductId: string | null;
  returnTo: string;
  dirty?: boolean;
  confirmLeave?: () => boolean;
  className?: string;
};

export function AdminNextItemNavigation({
  nextProductId,
  returnTo,
  dirty = false,
  confirmLeave,
  className,
}: AdminNextItemNavigationProps) {
  if (!nextProductId) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Это последний товар в текущей очереди.
      </p>
    );
  }

  const href = `/admin/catalog/${nextProductId}/edit?from=${encodeURIComponent(returnTo)}`;

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Link
        href={href}
        aria-label="Следующий товар в очереди оформления"
        data-unsaved={dirty ? "true" : undefined}
        onClick={(event) => {
          if (confirmLeave && !confirmLeave()) {
            event.preventDefault();
          }
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Следующий товар →
      </Link>
      <p className="text-xs text-muted-foreground">
        Без сохранения — или используйте «Сохранить и далее».
      </p>
    </div>
  );
}
