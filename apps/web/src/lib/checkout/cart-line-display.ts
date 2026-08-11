import type { CartLine } from "@/lib/checkout/api";
import { siteConfig } from "@/lib/store/site-config";

export type CartLineSnapshot = CartLine["product_snapshot"];

/** Normalize legacy USD fallbacks to storefront default (RUB). */
export function resolveCartCurrency(
  cartCurrency: string | null | undefined,
  lineCurrency?: string | null,
): string {
  const raw = cartCurrency ?? lineCurrency;
  if (!raw || raw.toUpperCase() === "USD") {
    return siteConfig.defaultCurrency;
  }
  return raw;
}

export function getCartLineTitle(snapshot: CartLineSnapshot): string {
  return snapshot.product_name?.trim() || "Товар";
}

export function getCartLineVariantLabel(snapshot: CartLineSnapshot): string | null {
  const attrs = snapshot.attributes ?? {};
  const parts: string[] = [];
  if (attrs.size) parts.push(`Размер: ${attrs.size}`);
  if (attrs.color) parts.push(`Цвет: ${attrs.color}`);
  if (parts.length > 0) return parts.join(" · ");

  const name = snapshot.name ?? snapshot.variant_name;
  if (name && name !== "Default") return name;
  return null;
}
