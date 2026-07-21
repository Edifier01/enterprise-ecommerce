import { adminFetchResult, type AdminFetchResult } from "@/lib/admin/admin-fetch";
import { ADMIN_CUSTOMERS_PAGE_SIZE } from "@/lib/admin/catalog";

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

export async function listAdminCustomers(
  page = 1,
  query?: string,
): Promise<AdminFetchResult<AdminCustomerList>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(ADMIN_CUSTOMERS_PAGE_SIZE),
  });
  if (query?.trim()) {
    params.set("q", query.trim());
  }
  return adminFetchResult<AdminCustomerList>(`/api/v1/admin/customers?${params}`);
}

export async function updateCustomerWholesaler(
  customerId: string,
  isWholesaler: boolean,
): Promise<AdminCustomer | null> {
  const result = await adminFetchResult<AdminCustomer>(
    `/api/v1/admin/customers/${customerId}/wholesaler`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_wholesaler: isWholesaler }),
    },
  );
  return result.ok ? result.data : null;
}
