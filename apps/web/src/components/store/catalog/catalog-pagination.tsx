"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const CATALOG_PAGE_SIZE = 48;

export function getTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
}

export function CatalogPagination({
  page,
  totalPages,
  buildHref,
  className,
}: CatalogPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = buildPageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Навигация по страницам каталога"
      className={cn("flex flex-wrap items-center justify-center gap-1", className)}
    >
      <PaginationLink
        href={buildHref(Math.max(1, page - 1))}
        disabled={page <= 1}
        label="Предыдущая страница"
      >
        ←
      </PaginationLink>

      {pages.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <PaginationLink
            key={item}
            href={buildHref(item)}
            active={item === page}
            label={`Страница ${item}`}
          >
            {item}
          </PaginationLink>
        ),
      )}

      <PaginationLink
        href={buildHref(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        label="Следующая страница"
      >
        →
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  children,
  active = false,
  disabled = false,
  label,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm text-muted-foreground opacity-50"
      >
        <span className="sr-only">{label}</span>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

function buildPageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
}
