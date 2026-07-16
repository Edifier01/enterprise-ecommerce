/** Converts rubles entered in admin forms to minor units (kopecks). */
export function rublesToCents(rubles: number): number {
  return Math.round(rubles * 100);
}

/** Converts stored minor units to rubles for admin form fields. */
export function centsToRubles(cents: number): number {
  return cents / 100;
}

/** Parses a ruble amount from form data; returns undefined when empty. */
export function parseOptionalRubles(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const rubles = Number(value);
  if (!Number.isFinite(rubles) || rubles < 0) {
    throw new Error("INVALID_PRICE");
  }
  return rublesToCents(rubles);
}

/** Parses a required ruble amount from form data. */
export function parseRequiredRubles(value: FormDataEntryValue | null): number {
  const cents = parseOptionalRubles(value);
  if (cents === undefined) {
    throw new Error("INVALID_PRICE");
  }
  return cents;
}
