"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterFacets,
  type CatalogFilterState,
} from "@/lib/store/catalog-filters";
import { formatPrice } from "@/lib/store/format";
import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

export interface CatalogFiltersPanelProps {
  facets: CatalogFilterFacets;
  value: CatalogFilterState;
  onChange: (value: CatalogFilterState) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  activeCount?: number;
  className?: string;
}

function CheckboxFilter({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 shrink-0 rounded border-input accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

function MultiCheckboxGroup({
  title,
  options,
  selected,
  counts,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  counts?: Record<string, number>;
  onToggle: (option: string) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-foreground">{title}</legend>
      <div className="space-y-2">
        {options.map((option) => {
          const count = counts?.[option];
          return (
            <label
              key={option}
              className="flex min-h-11 cursor-pointer items-center gap-3 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
                className="size-5 shrink-0 rounded border-input accent-primary"
              />
              <span className="flex flex-1 items-center justify-between gap-2">
                <span>{option}</span>
                {typeof count === "number" ? (
                  <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function FilterContent({
  facets,
  value,
  onChange,
}: {
  facets: CatalogFilterFacets;
  value: CatalogFilterState;
  onChange: (value: CatalogFilterState) => void;
}) {
  function toggleListValue(key: "sizes" | "colors", option: string) {
    const current = value[key];
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];
    onChange({ ...value, [key]: next });
  }

  const minPlaceholder = facets.priceRange.min
    ? formatPrice(facets.priceRange.min, siteConfig.defaultCurrency)
    : "0";
  const maxPlaceholder = facets.priceRange.max
    ? formatPrice(facets.priceRange.max, siteConfig.defaultCurrency)
    : "∞";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <CheckboxFilter
          label="Только в наличии"
          checked={value.inStockOnly}
          onChange={(checked) => onChange({ ...value, inStockOnly: checked })}
        />
        <CheckboxFilter
          label="Только со скидкой"
          checked={value.onSaleOnly}
          onChange={(checked) => onChange({ ...value, onSaleOnly: checked })}
        />
      </div>

      <MultiCheckboxGroup
        title="Размер"
        options={facets.sizes}
        selected={value.sizes}
        counts={facets.sizeCounts}
        onToggle={(option) => toggleListValue("sizes", option)}
      />

      <MultiCheckboxGroup
        title="Цвет / камуфляж"
        options={facets.colors}
        selected={value.colors}
        counts={facets.colorCounts}
        onToggle={(option) => toggleListValue("colors", option)}
      />

      {facets.priceRange.max > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Цена</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              От, ₽
              <input
                type="number"
                min={0}
                placeholder={minPlaceholder.replace(/[^\d]/g, "")}
                value={value.priceMin != null ? value.priceMin / 100 : ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    priceMin: event.target.value
                      ? Number(event.target.value) * 100
                      : null,
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              До, ₽
              <input
                type="number"
                min={0}
                placeholder={maxPlaceholder.replace(/[^\d]/g, "")}
                value={value.priceMax ? value.priceMax / 100 : ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    priceMax: event.target.value
                      ? Number(event.target.value) * 100
                      : null,
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
              />
            </label>
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}

export function CatalogFiltersPanel({
  facets,
  value,
  onChange,
  mobileOpen = false,
  onMobileOpenChange,
  activeCount = 0,
  className,
}: CatalogFiltersPanelProps) {
  const isMobileDrawer = className?.includes("lg:hidden");

  if (isMobileDrawer && mobileOpen) {
    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-black/50"
          aria-label="Закрыть фильтры"
          onClick={() => onMobileOpenChange?.(false)}
        />
        <aside className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Фильтры</p>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Закрыть"
              onClick={() => onMobileOpenChange?.(false)}
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <FilterContent facets={facets} value={value} onChange={onChange} />
          </div>
          <div className="border-t p-4">
            <Button
              type="button"
              className="w-full"
              onClick={() => onMobileOpenChange?.(false)}
            >
              Показать результаты
            </Button>
          </div>
        </aside>
      </div>
    );
  }

  if (isMobileDrawer) {
    return null;
  }

  return (
    <aside
      className={cn(
        "h-fit rounded-lg border bg-muted/20 p-4",
        className,
      )}
      aria-label="Фильтры каталога"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Фильтры</h2>
        {activeCount > 0 ? (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:text-primary/80"
            onClick={() => onChange(EMPTY_CATALOG_FILTERS)}
          >
            Сбросить
          </button>
        ) : null}
      </div>
      <FilterContent facets={facets} value={value} onChange={onChange} />
    </aside>
  );
}
