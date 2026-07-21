import "server-only";

import { getCurrentAdmin } from "@/lib/admin/session";
import type { AdminUser } from "@/lib/admin/types";

export type AdminPermissionResult =
  | { ok: true; admin: AdminUser }
  | { ok: false; error: string };

export const ADMIN_PAGE_FORBIDDEN_MESSAGE =
  "Недостаточно прав для просмотра этой страницы.";

/** Verify the current admin session includes a specific permission. */
export async function requireAdminPermission(
  permission: string,
): Promise<AdminPermissionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { ok: false, error: "Требуется вход в админ-панель." };
  }
  if (!admin.permissions.includes(permission)) {
    return { ok: false, error: "Недостаточно прав для этого действия." };
  }
  return { ok: true, admin };
}

/** Verify the current admin has at least one of the listed permissions. */
export async function requireAnyAdminPermission(
  permissions: readonly string[],
): Promise<AdminPermissionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { ok: false, error: "Требуется вход в админ-панель." };
  }
  if (!permissions.some((permission) => admin.permissions.includes(permission))) {
    return { ok: false, error: "Недостаточно прав для этого действия." };
  }
  return { ok: true, admin };
}

/** Page-level RBAC aligned with sidebar `permissions` and API `require_permission`. */
export function adminHasPermission(admin: AdminUser, permission: string): boolean {
  return admin.permissions.includes(permission);
}
