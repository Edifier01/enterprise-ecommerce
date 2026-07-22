const ADMIN_TIME_ZONE = "Europe/Moscow";

const adminDateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: ADMIN_TIME_ZONE,
});

/** Stable admin date/time label — fixed timezone avoids SSR/client hydration mismatches. */
export function formatAdminDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return adminDateTimeFormatter.format(date);
  } catch {
    return typeof value === "string" ? value : null;
  }
}
