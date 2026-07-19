"use client";

import { cn } from "@/lib/utils";
import type { ProductOptionGroup, ProductVariant } from "@/lib/api";
import {
  getValueState,
  resolveVariant,
  usesStructuredSelector,
  type VariantSelection,
} from "@/lib/store/variant-options";
import { getSwatchStyle } from "@/lib/store/color-swatch";

export interface VariantSelectorProps {
  optionGroups: ProductOptionGroup[];
  variants: ProductVariant[];
  selection: VariantSelection;
  onSelectionChange: (selection: VariantSelection) => void;
  className?: string;
}

function SizePill({
  label,
  active,
  disabled,
  outOfStock,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  outOfStock: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-input bg-background text-muted-foreground hover:border-ring",
        (disabled || outOfStock) && "opacity-50",
        outOfStock && "line-through",
      )}
    >
      {label}
    </button>
  );
}

function ColorSwatch({
  label,
  active,
  disabled,
  outOfStock,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  outOfStock: boolean;
  onClick: () => void;
}) {
  const style = getSwatchStyle(label);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative size-11 rounded-full border-2 transition-transform",
        active ? "border-primary ring-2 ring-primary/30" : "border-input",
        (disabled || outOfStock) && "opacity-60",
      )}
    >
      <span
        className="absolute inset-1 rounded-full"
        style={style}
      />
      {outOfStock ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="block h-px w-full rotate-45 bg-muted-foreground/70" />
        </span>
      ) : null}
    </button>
  );
}

export function VariantSelector({
  optionGroups,
  variants,
  selection,
  onSelectionChange,
  className,
}: VariantSelectorProps) {
  if (!usesStructuredSelector(optionGroups, variants.length)) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {optionGroups.map((group) => (
          <fieldset key={group.key} className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">
              {group.label}
              {selection[group.key] ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  {selection[group.key]}
                </span>
              ) : null}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => {
                const active = selection[group.key] === value;
                const state = getValueState(variants, selection, group.key, value);
                const unavailable = !state.exists || !state.inStock;

                const handleSelect = () => {
                  if (!state.exists) {
                    return;
                  }
                  onSelectionChange({ ...selection, [group.key]: value });
                };

                if (group.key === "color") {
                  return (
                    <ColorSwatch
                      key={value}
                      label={value}
                      active={active}
                      disabled={!state.exists}
                      outOfStock={state.exists && !state.inStock}
                      onClick={handleSelect}
                    />
                  );
                }

                return (
                  <SizePill
                    key={value}
                    label={value}
                    active={active}
                    disabled={!state.exists}
                    outOfStock={state.exists && !state.inStock}
                    onClick={handleSelect}
                  />
                );
              })}
            </div>
          </fieldset>
        ))}
    </div>
  );
}

export function FlatVariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (variantId: string) => void;
}) {
  const sorted = [...variants].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-foreground">Вариант</legend>
      <div className="flex flex-wrap gap-2">
        {sorted.map((variant) => {
          const isActive = variant.id === selectedId;
          return (
            <button
              key={variant.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(variant.id)}
              disabled={!variant.in_stock}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-input bg-background text-muted-foreground hover:border-ring",
                !variant.in_stock && "cursor-not-allowed opacity-50 line-through",
              )}
            >
              {variant.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function selectionToVariant(
  variants: ProductVariant[],
  selection: VariantSelection,
): ProductVariant | null {
  return resolveVariant(variants, selection);
}

export function isSelectionComplete(
  optionGroups: ProductOptionGroup[],
  selection: VariantSelection,
  variantCount?: number,
): boolean {
  if (!usesStructuredSelector(optionGroups, variantCount)) {
    return true;
  }
  return optionGroups.every((group) => Boolean(selection[group.key]));
}
