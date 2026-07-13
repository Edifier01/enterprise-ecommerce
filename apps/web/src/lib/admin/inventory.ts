import "server-only";

import { getAdminAccessToken } from "@/lib/admin/session";
import type { AdminInventoryItem, AdminInventoryList } from "@/lib/admin/inventory-shared";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type { AdminInventoryItem, AdminInventoryList };
export { INVENTORY_REASONS } from "@/lib/admin/inventory-shared";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = await getAdminAccessToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function listAdminInventory(
  page = 1,
  lowStock = false,
): Promise<AdminInventoryList | null> {
  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (lowStock) params.set("low_stock", "true");
  return adminFetch<AdminInventoryList>(`/api/v1/admin/inventory?${params}`);
}

export async function adjustAdminInventory(
  variantId: string,
  body: { quantity_on_hand: number; reason: string; version: number },
): Promise<{ ok: true; data: AdminInventoryItem } | { ok: false; error: string }> {
  const token = await getAdminAccessToken();
  if (!token) {
    return { ok: false, error: "Требуется вход в админ-панель." };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/inventory/${variantId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { detail?: string } | null;
    return { ok: false, error: detail?.detail ?? "Не удалось обновить остаток." };
  }

  return { ok: true, data: (await res.json()) as AdminInventoryItem };
}
