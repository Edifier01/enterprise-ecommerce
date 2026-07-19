import { getAdminAccessToken } from "@/lib/admin/session";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type MoySkladIntegrationStatus = {
  configured: boolean;
  read_only: boolean;
  order_export_enabled: boolean;
  store_id: string | null;
  webhooks_enabled: boolean;
  pending_order_exports: number;
  pending_imports: number;
  last_full_sync_at: string | null;
  last_incremental_sync_at: string | null;
  last_error: string | null;
  errors_last_24h: number;
};

export type MoySkladPullResult = {
  status: string;
  direction: string;
  products_created: number;
  products_updated: number;
  variants_created: number;
  variants_updated: number;
  stock_rows_applied: number;
  errors: string[];
};

export type MoySkladStockPullResult = {
  status: string;
  direction: string;
  stock_rows_applied: number;
  errors: string[];
};

export type SyncLogEntry = {
  id: string;
  direction: string;
  entity_type: string;
  entity_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

async function integrationFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const token = await getAdminAccessToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  if (res.status === 204) return null;
  return res.json() as Promise<T>;
}

export async function getMoySkladStatus(): Promise<MoySkladIntegrationStatus | null> {
  return integrationFetch<MoySkladIntegrationStatus>(
    "/api/v1/admin/integrations/moysklad/status",
  );
}

export async function listSyncLogs(): Promise<SyncLogEntry[] | null> {
  const data = await integrationFetch<{ items: SyncLogEntry[] }>(
    "/api/v1/admin/integrations/moysklad/logs",
  );
  return data?.items ?? null;
}

export async function mutateMoySklad(
  path: string,
  method: string,
  body?: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number }> {
  const token = await getAdminAccessToken();
  if (!token) return { ok: false, status: 401 };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) return { ok: false, status: res.status };
  if (res.status === 204) return { ok: true, data: null };
  return { ok: true, data: await res.json() };
}
