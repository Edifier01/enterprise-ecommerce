import "server-only";

import { adminFetch } from "@/lib/admin/admin-fetch";
import { getAdminAccessToken } from "@/lib/admin/session";
import { ADMIN_ORDERS_PAGE_SIZE } from "@/lib/admin/catalog";
import type {
  AdminOrderDetail,
  AdminOrderList,
  AdminOrderSummary,
} from "@/lib/admin/orders-shared";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type { AdminOrderDetail, AdminOrderLine, AdminOrderList, AdminOrderSummary, AdminOrderStatusHistory } from "@/lib/admin/orders-shared";
export { formatOrderMoney, getAdminOrderStatusLabel } from "@/lib/admin/orders-shared";

export async function listAdminOrders(
  page = 1,
  status?: string,
): Promise<AdminOrderList | null> {
  const params = new URLSearchParams({ page: String(page), limit: String(ADMIN_ORDERS_PAGE_SIZE) });
  if (status) params.set("status", status);
  return adminFetch<AdminOrderList>(`/api/v1/admin/orders?${params}`);
}

export async function getAdminOrder(orderNumber: string): Promise<AdminOrderDetail | null> {
  return adminFetch<AdminOrderDetail>(
    `/api/v1/admin/orders/${encodeURIComponent(orderNumber)}`,
  );
}

export async function updateAdminOrderStatus(
  orderNumber: string,
  body: { status: "shipped" | "canceled"; reason?: string },
): Promise<{ ok: true; data: AdminOrderDetail } | { ok: false; error: string }> {
  const token = await getAdminAccessToken();
  if (!token) {
    return { ok: false, error: "Требуется вход в админ-панель." };
  }

  const res = await fetch(
    `${API_BASE}/api/v1/admin/orders/${encodeURIComponent(orderNumber)}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { detail?: string } | null;
    return { ok: false, error: detail?.detail ?? "Не удалось обновить статус заказа." };
  }

  return { ok: true, data: (await res.json()) as AdminOrderDetail };
}
