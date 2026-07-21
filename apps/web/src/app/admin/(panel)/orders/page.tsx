import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import { AdminOrdersSearch } from "@/components/admin/orders/admin-orders-search";
import { AdminOrdersTable } from "@/components/admin/orders/admin-orders-table";
import { ADMIN_ORDERS_PAGE_SIZE } from "@/lib/admin/catalog";
import {
  getAdminOrderStatusLabel,
  listAdminOrders,
} from "@/lib/admin/orders";
import {
  buildAdminOrderDetailHref,
  buildAdminOrdersListHref,
  type AdminOrdersListParams,
} from "@/lib/admin/orders-list-url";
import {
  ADMIN_PAGE_FORBIDDEN_MESSAGE,
  adminHasPermission,
} from "@/lib/admin/require-admin-permission";
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
  { value: "export_pending", label: "Ожидает экспорта в MS" },
] as const;

type PageProps = {
  searchParams: Promise<{ page?: string; status?: string; export_pending?: string; q?: string }>;
};

function parsePage(raw: string | undefined): number {
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!adminHasPermission(admin, "admin:read")) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {ADMIN_PAGE_FORBIDDEN_MESSAGE}
      </p>
    );
  }

  const { page: pageRaw, status, export_pending, q } = await searchParams;
  const page = parsePage(pageRaw);
  const searchQuery = q?.trim() ?? "";
  const exportPending = export_pending === "1" || export_pending === "true";
  const activeStatus =
    !exportPending &&
    (status === "confirmed" || status === "shipped" || status === "canceled")
      ? status
      : undefined;
  const ordersResult = await listAdminOrders(
    page,
    activeStatus,
    exportPending,
    searchQuery || undefined,
  );

  if (!ordersResult.ok) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {ordersResult.error}
      </p>
    );
  }

  const orders = ordersResult.data;
  const totalPages = getAdminTotalPages(orders.total, ADMIN_ORDERS_PAGE_SIZE);
  const listParams: AdminOrdersListParams = {
    page,
    status: activeStatus,
    exportPending,
    q: searchQuery || undefined,
  };

  function buildHref(nextPage: number) {
    return buildAdminOrdersListHref({ ...listParams, page: nextPage });
  }

  function filterHref(filterValue: string): string {
    if (filterValue === "") {
      return buildAdminOrdersListHref({ q: searchQuery || undefined });
    }
    if (filterValue === "export_pending") {
      return buildAdminOrdersListHref({ exportPending: true, q: searchQuery || undefined });
    }
    return buildAdminOrdersListHref({
      status: filterValue,
      q: searchQuery || undefined,
    });
  }

  const activeFilter = exportPending ? "export_pending" : (activeStatus ?? "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заказы</h1>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? `Результаты поиска (${orders.total})`
              : `Управление заказами (${orders.total} всего).`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {STATUS_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.value;
            return (
              <Link
                key={filter.label}
                href={filterHref(filter.value)}
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

      <AdminOrdersSearch
        defaultQuery={searchQuery}
        status={activeStatus}
        exportPending={exportPending}
      />

      <AdminOrdersTable
        orders={orders.items}
        getStatusLabel={getAdminOrderStatusLabel}
        showExportStatus
        buildOrderHref={(orderNumber) => buildAdminOrderDetailHref(orderNumber, listParams)}
      />

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
