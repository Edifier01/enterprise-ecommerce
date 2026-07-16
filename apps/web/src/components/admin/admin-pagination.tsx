import Link from "next/link";

import { cn } from "@/lib/utils";

export function getAdminTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export interface AdminPaginationProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
}

export function AdminPagination({
  page,
  totalPages,
  buildHref,
  className,
}: AdminPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Навигация по страницам"
      className={cn("flex flex-wrap items-center justify-center gap-2", className)}
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted"
        >
          ← Назад
        </Link>
      ) : (
        <span className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm text-muted-foreground opacity-50">
          ← Назад
        </span>
      )}

      <span className="text-sm text-muted-foreground">
        Страница {page} из {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted"
        >
          Вперёд →
        </Link>
      ) : (
        <span className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm text-muted-foreground opacity-50">
          Вперёд →
        </span>
      )}
    </nav>
  );
}
