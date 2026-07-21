import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { ADMIN_ACCESS_TOKEN_COOKIE } from "@/lib/admin/constants";
import type { AdminUser, DashboardSummary } from "@/lib/admin/types";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type { AdminUser, DashboardSummary };

export async function getAdminAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
}

/** Deduped per request — layout + pages share one /me call. */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const token = await getAdminAccessToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}/api/v1/admin/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
});

export const getDashboardSummary = cache(async (): Promise<DashboardSummary | null> => {
  const token = await getAdminAccessToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}/api/v1/admin/dashboard/summary`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
});

export function buildAdminAuthCookieOptions(maxAgeSeconds = 60 * 30) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/admin",
    maxAge: maxAgeSeconds,
  };
}
