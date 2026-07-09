/** Resolve API base URL for server vs browser contexts. */
export function getApiBase(): string {
  if (typeof window === "undefined" && process.env.API_INTERNAL_URL) {
    return process.env.API_INTERNAL_URL;
  }

  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}
