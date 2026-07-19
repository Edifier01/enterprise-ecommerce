import type { ProductOptionGroup, ProductVariant } from "@/lib/api";

export type VariantSelection = Record<string, string>;

function normalizeColor(value: string): string {
  const lower = value.toLowerCase();
  const map: Record<string, string> = {
    multicam: "Multicam",
    coyote: "Coyote",
    olive: "Olive",
    black: "Black",
    "ranger green": "Ranger Green",
    woodland: "Woodland",
  };
  for (const [keyword, label] of Object.entries(map)) {
    if (lower.includes(keyword)) {
      return label;
    }
  }
  return value.trim();
}

export function variantOptionValues(variant: ProductVariant): VariantSelection {
  const selected: VariantSelection = {};
  const attrs = variant.attributes ?? {};

  const colorRaw = attrs.color || attrs.camouflage;
  if (colorRaw?.trim()) {
    selected.color = normalizeColor(colorRaw);
  }
  if (attrs.size?.trim()) {
    selected.size = attrs.size.trim();
  }
  if (attrs.waist?.trim()) {
    selected.waist = `W${attrs.waist.trim()}`;
  }

  return selected;
}

export function usesStructuredSelector(
  optionGroups: ProductOptionGroup[],
  variantCount?: number,
): boolean {
  if (variantCount != null && variantCount <= 1) {
    return false;
  }
  if (optionGroups.length === 0) {
    return false;
  }
  const totalValues = optionGroups.reduce((sum, group) => sum + group.values.length, 0);
  return totalValues > 1;
}

export function resolveVariant(
  variants: ProductVariant[],
  selection: VariantSelection,
): ProductVariant | null {
  if (!selection || Object.keys(selection).length === 0) {
    return null;
  }

  return (
    variants.find((variant) => {
      const options = variantOptionValues(variant);
      return Object.entries(selection).every(([key, value]) => options[key] === value);
    }) ?? null
  );
}

export function pickDefaultSelection(
  variants: ProductVariant[],
  optionGroups: ProductOptionGroup[],
): VariantSelection {
  if (variants.length === 0 || optionGroups.length === 0) {
    return {};
  }

  const defaultVariant =
    variants.find((variant) => variant.is_default) ?? variants[0];
  const defaultOptions = variantOptionValues(defaultVariant);
  const selection: VariantSelection = {};

  for (const group of optionGroups) {
    if (defaultOptions[group.key]) {
      selection[group.key] = defaultOptions[group.key];
    }
  }

  for (const group of optionGroups) {
    if (selection[group.key]) {
      continue;
    }
    for (const value of group.values) {
      const trial = { ...selection, [group.key]: value };
      if (resolveVariant(variants, trial)) {
        selection[group.key] = value;
        break;
      }
    }
  }

  return selection;
}

export function getValueState(
  variants: ProductVariant[],
  selection: VariantSelection,
  axisKey: string,
  value: string,
): { exists: boolean; inStock: boolean } {
  const trial = { ...selection, [axisKey]: value };
  const matches = variants.filter((variant) => {
    const options = variantOptionValues(variant);
    return Object.entries(trial).every(([key, item]) => options[key] === item);
  });

  return {
    exists: matches.length > 0,
    inStock: matches.some((variant) => variant.in_stock),
  };
}

export function extractColorOptions(optionGroups: ProductOptionGroup[]): string[] {
  const colorGroup = optionGroups.find((group) => group.key === "color");
  return colorGroup?.values ?? [];
}

export function getVariantPriceRange(variants: ProductVariant[]): {
  min: number;
  max: number;
} | null {
  if (variants.length === 0) {
    return null;
  }
  const prices = variants.map((variant) => variant.price_cents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max };
}

export function pickDefaultVariant(variants: ProductVariant[]): ProductVariant | null {
  if (variants.length === 0) {
    return null;
  }
  return variants.find((variant) => variant.is_default) ?? variants[0];
}

export function getColorOptionsFromVariants(variants: ProductVariant[]): string[] {
  const values = new Set<string>();
  for (const variant of variants) {
    const color = variantOptionValues(variant).color;
    if (color) {
      values.add(color);
    }
  }
  return [...values];
}
