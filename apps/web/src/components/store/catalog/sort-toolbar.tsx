"use client";

import { cn } from "@/lib/utils";

export const SORT_OPTIONS = [
  { value: "default", label: "По умолчанию" },
  { value: "popular", label: "Рекомендации" },
  { value: "price-asc", label: "Цена: по возрастанию" },
  { value: "price-desc", label: "Цена: по убыванию" },
  { value: "name-asc", label: "Название: А–Я" },
  { value: "name-desc", label: "Название: Я–А" },
] as const;

export type SortOptionValue = (typeof SORT_OPTIONS)[number]["value"];

export interface SortToolbarProps {
  value: SortOptionValue;
  onChange: (value: SortOptionValue) => void;
  totalCount?: number;
  disabled?: boolean;
  className?: string;
}

export function SortToolbar({
  value,
  onChange,
  totalCount,
  disabled = false,
  className,
}: SortToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-4",
        className
      )}
    >
      {typeof totalCount === "number" ? (
        <p className="text-sm text-muted-foreground">
          Найдено:{" "}
          <span className="font-medium text-foreground">{totalCount}</span>
        </p>
      ) : (
        <span className="text-sm text-muted-foreground">Сортировка</span>
      )}

      <label className="flex w-full items-center gap-2 text-sm sm:w-auto">
        <span className="shrink-0 text-muted-foreground sm:sr-only">Сортировка</span>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as SortOptionValue)}
          className="h-11 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-auto sm:min-w-[12rem]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Client-side sort helper for catalog listing pages. */
export function sortProducts<T extends { name: string; price_cents: number }>(
  products: T[],
  sort: SortOptionValue
): T[] {
  const sorted = [...products];

  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price_cents - b.price_cents);
    case "price-desc":
      return sorted.sort((a, b) => b.price_cents - a.price_cents);
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, "ru"));
    default:
      return sorted;
  }
}
