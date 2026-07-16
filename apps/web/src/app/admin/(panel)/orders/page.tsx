import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import { AdminOrdersTable } from "@/components/admin/orders/admin-orders-table";
import { ADMIN_ORDERS_PAGE_SIZE } from "@/lib/admin/catalog";
import {
  getAdminOrderStatusLabel,
  listAdminOrders,
} from "@/lib/admin/orders";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Заказы — Админ-панель",
  robots: { index: false, follow: false },
};

const STATUS_FILTERS = [
  { value: "", label: "Все" },
  { value: "confirmed", label: "Подтверждённые" },
  { value: "shipped", label: "Отправленные" },
  { value: "canceled", label: "Отменённые" },
] as const;

type PageProps = {
  searchParams: Promise<{ page?: string; status?: string }>;
};

function parsePage(raw: string | undefined): number {
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const { page: pageRaw, status } = await searchParams;
  const page = parsePage(pageRaw);
  const activeStatus =
    status === "confirmed" || status === "shipped" || status === "canceled"
      ? status
      : undefined;
  const orders = await listAdminOrders(page, activeStatus);

  if (!orders) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить заказы. Проверьте права доступа.
      </p>
    );
  }

  const totalPages = getAdminTotalPages(orders.total, ADMIN_ORDERS_PAGE_SIZE);

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (nextPage > 1) params.set("page", String(nextPage));
    if (activeStatus) params.set("status", activeStatus);
    const query = params.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заказы</h1>
          <p className="text-sm text-muted-foreground">
            Управление заказами ({orders.total} всего).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {STATUS_FILTERS.map((filter) => {
            const params = new URLSearchParams();
            if (filter.value) params.set("status", filter.value);
            const href = params.size > 0 ? `/admin/orders?${params}` : "/admin/orders";
            const isActive = (activeStatus ?? "") === filter.value;
            return (
              <Link
                key={filter.label}
                href={href}
                className={
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      <AdminOrdersTable
        orders={orders.items}
        getStatusLabel={getAdminOrderStatusLabel}
      />

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
