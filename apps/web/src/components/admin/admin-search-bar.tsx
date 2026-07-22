"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

type HiddenParams = Record<string, string | undefined>;

type AdminSearchBarProps = {
  action: string;
  label: string;
  placeholder: string;
  defaultQuery?: string;
  hidden?: HiddenParams;
  className?: string;
};

function buildClearHref(action: string, hidden: HiddenParams | undefined): string {
  const params = new URLSearchParams();
  if (hidden) {
    for (const [key, value] of Object.entries(hidden)) {
      if (value) params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${action}?${query}` : action;
}

export function AdminSearchBar({
  action,
  label,
  placeholder,
  defaultQuery = "",
  hidden,
  className,
}: AdminSearchBarProps) {
  const showClear = defaultQuery.length > 0;

  return (
    <form
      method="get"
      action={action}
      className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end", className)}
    >
      {hidden
        ? Object.entries(hidden).map(([key, value]) =>
            value ? <input key={key} type="hidden" name={key} value={value} /> : null,
          )
        : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor={`${action}-search`} className="text-sm font-medium">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={`${action}-search`}
            type="search"
            name="q"
            defaultValue={defaultQuery}
            placeholder={placeholder}
            className="h-9 min-w-[16rem] flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {showClear ? (
            <Link
              href={buildClearHref(action, hidden)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Очистить
            </Link>
          ) : null}
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Найти
          </button>
        </div>
      </div>
    </form>
  );
}
