/**
 * Static taxonomy fallback is allowed only outside production (EUX-009).
 * Production must show honest empty/error states instead of fake categories.
 */
export function allowStaticCategoryFallback(): boolean {
  return process.env.NODE_ENV !== "production";
}
