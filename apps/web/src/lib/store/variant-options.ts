import type { ProductOptionGroup, ProductVariant } from "@/lib/api";

export type VariantSelection = Record<string, string>;

const SIZE_KEYS = new Set(["size", "размер", "размер обуви", "размер ремня", "shoe size", "belt size"]);
const COLOR_KEYS = new Set(["color", "цвет", "камуфляж", "camouflage", "расцветка"]);
const WAIST_KEYS = new Set(["waist", "талия", "обхват талии"]);

function extractSizeFromName(name?: string | null): string | null {
  const match = name?.trim().match(/\(([^)]+)\)\s*$/);
  if (!match) {
    return null;
  }
  const candidate = match[1].trim().replace(/–/g, "-").replace(/\s*-\s*/g, "-");
  return /^(?:\d{2,3}(?:-\d{2,3})?|[XxSsMmLl]{1,3})$/.test(candidate) ? candidate : null;
}

function canonicalAttributeKey(rawKey: string): "size" | "color" | "waist" | null {
  const key = rawKey.trim().toLocaleLowerCase();
  if (!key) {
    return null;
  }
  if (SIZE_KEYS.has(key) || (key.includes("размер") && !key.includes("цвет"))) {
    return "size";
  }
  if (COLOR_KEYS.has(key) || key.includes("цвет") || key.includes("камуфляж") || key.includes("camouflage")) {
    return "color";
  }
  if (WAIST_KEYS.has(key) || key.includes("талия")) {
    return "waist";
  }
  return null;
}

function normalizeVariantAttributes(
  attributes: ProductVariant["attributes"] | null | undefined,
  name?: string | null,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (value == null) {
      continue;
    }
    normalized[key] = String(value);
  }
  for (const [key, value] of Object.entries(normalized)) {
    const canonical = canonicalAttributeKey(key);
    const trimmed = value.trim();
    if (canonical && trimmed && !normalized[canonical]?.trim()) {
      normalized[canonical] = trimmed;
    }
  }
  if (!normalized.size?.trim()) {
    const fromName = extractSizeFromName(name);
    if (fromName) {
      normalized.size = fromName;
    }
  }
  return normalized;
}

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
  const attrs = normalizeVariantAttributes(variant.attributes, variant.name);

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

  const defaultVariant = pickDefaultVariant(variants) ?? variants[0];
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
    let fallback: string | undefined;
    for (const value of group.values) {
      const trial = { ...selection, [group.key]: value };
      const match = resolveVariant(variants, trial);
      if (!match) {
        continue;
      }
      if (match.in_stock) {
        selection[group.key] = value;
        break;
      }
      fallback ??= value;
    }
    if (!selection[group.key] && fallback) {
      selection[group.key] = fallback;
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
  const sorted = [...variants].sort((a, b) => a.sort_order - b.sort_order);
  const defaultVariant = sorted.find((variant) => variant.is_default) ?? sorted[0];
  return defaultVariant.in_stock
    ? defaultVariant
    : sorted.find((variant) => variant.in_stock) ?? defaultVariant;
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

const SUMMARY_LABELS: Record<string, string> = {
  size: "Размер",
  color: "Цвет",
  waist: "Талия",
};

export function formatVariantSelectionSummary(
  variant: ProductVariant,
  structured: boolean,
  selection: VariantSelection,
): string {
  const parts: string[] = [];

  if (structured) {
    for (const [key, label] of Object.entries(SUMMARY_LABELS)) {
      const value = selection[key]?.trim();
      if (value) {
        parts.push(`${label}: ${value}`);
      }
    }
  } else {
    const attrs = normalizeVariantAttributes(variant.attributes, variant.name);
    if (attrs.size?.trim()) {
      parts.push(`Размер: ${attrs.size.trim()}`);
    }
    if (attrs.color?.trim()) {
      parts.push(`Цвет: ${attrs.color.trim()}`);
    }
    if (variant.name && variant.name !== "Default" && parts.length === 0) {
      parts.push(variant.name);
    }
  }

  return parts.join(" · ");
}
