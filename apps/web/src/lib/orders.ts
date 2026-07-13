import { getAccessToken } from "@/lib/auth/session";
import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type OrderSummary = {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  total_cents: number;
  created_at: string;
};

export type OrderLine = {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  product_snapshot: {
    product_name: string;
    product_slug: string;
    name: string;
    sku: string;
    currency: string;
  };
};

export type OrderDetail = OrderSummary & {
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  updated_at: string;
  lines: OrderLine[];
};

export type OrderListResponse = {
  items: OrderSummary[];
  total: number;
  page: number;
  limit: number;
};

async function fetchWithAuth(path: string): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("NOT_AUTHENTICATED");
  }

  return fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export async function listOrders(
  page = 1,
  limit = 20
): Promise<OrderListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await fetchWithAuth(`/api/v1/orders?${params}`);
  if (res.status === 401) throw new Error("NOT_AUTHENTICATED");
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function getOrder(orderNumber: string): Promise<OrderDetail> {
  const res = await fetchWithAuth(`/api/v1/orders/${encodeURIComponent(orderNumber)}`);
  if (res.status === 401) throw new Error("NOT_AUTHENTICATED");
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error("Failed to fetch order");
  return res.json();
}

export function getOrderStatusLabel(status: string): string {
  switch (status) {
    case "confirmed":
      return "Подтверждён";
    case "shipped":
      return "Отправлен";
    case "canceled":
      return "Отменён";
    default:
      return status;
  }
}
