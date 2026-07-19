export function sanitizeAdminRedirect(from: string | undefined | null): string {
  if (typeof from !== "string" || from.trim() === "") {
    return "/admin";
  }

  const path = from.trim();
  if (!path.startsWith("/admin") || path.startsWith("/admin/login") || path.includes("//")) {
    return "/admin";
  }

  return path;
}
