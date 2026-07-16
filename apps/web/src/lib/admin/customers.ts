import { getAdminAccessToken } from "@/lib/admin/session";
import { ADMIN_CUSTOMERS_PAGE_SIZE } from "@/lib/admin/catalog";
import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type AdminCustomer = {
  id: string;
  email: string;
  is_wholesaler: boolean;
  created_at: string;
};

export type AdminCustomerList = {
  items: AdminCustomer[];
  total: number;
  page: number;
  limit: number;
};

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

export async function listAdminCustomers(page = 1): Promise<AdminCustomerList | null> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(ADMIN_CUSTOMERS_PAGE_SIZE),
  });
  return adminFetch<AdminCustomerList>(`/api/v1/admin/customers?${params}`);
}

export async function updateCustomerWholesaler(
  customerId: string,
  isWholesaler: boolean,
): Promise<AdminCustomer | null> {
  return adminFetch<AdminCustomer>(`/api/v1/admin/customers/${customerId}/wholesaler`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_wholesaler: isWholesaler }),
  });
}
