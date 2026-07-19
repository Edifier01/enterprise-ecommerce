import "server-only";

import { getAdminAccessToken } from "@/lib/admin/session";
import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = await getAdminAccessToken();
  if (!token) {
    return null;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return res.json() as Promise<T>;
}
