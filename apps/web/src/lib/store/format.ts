import { siteConfig } from "@/lib/store/site-config";

const DEFAULT_LOCALE = siteConfig.locale;

/**
 * Formats a price in minor units (cents/kopecks) for Russian storefront display.
 *
 * @example formatPrice(199900, "RUB") → "1 999 ₽"
 */
export function formatPrice(
  cents: number,
  currency: string,
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: currency.toUpperCase() === "RUB" ? 0 : 2,
  }).format(cents / 100);
}

/**
 * Formats a compare-at (original) price for sale UI with strikethrough styling applied separately.
 */
export function formatCompareAtPrice(
  cents: number,
  currency: string,
  locale: string = DEFAULT_LOCALE
): string {
  return formatPrice(cents, currency, locale);
}

/**
 * Returns a numeric discount percentage when compare-at price exceeds current price.
 */
export function getDiscountPercent(
  priceCents: number,
  compareAtCents: number
): number | null {
  if (compareAtCents <= priceCents || compareAtCents <= 0) {
    return null;
  }

  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}
