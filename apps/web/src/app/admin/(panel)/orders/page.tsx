import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminOrdersTable } from "@/components/admin/orders/admin-orders-table";
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
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const { status } = await searchParams;
  const activeStatus =
    status === "confirmed" || status === "shipped" || status === "canceled"
      ? status
      : undefined;
  const orders = await listAdminOrders(1, activeStatus);

  if (!orders) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить заказы. Проверьте права доступа.
      </p>
    );
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
            const href =
              filter.value === ""
                ? "/admin/orders"
                : `/admin/orders?status=${filter.value}`;
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
    </div>
  );
}
