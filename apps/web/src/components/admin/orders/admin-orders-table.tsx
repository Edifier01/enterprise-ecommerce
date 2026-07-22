"use client";

import Link from "next/link";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import {
  AdminMobileCard,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import { Badge } from "@/components/ui/badge";
import { formatAdminDate } from "@/lib/admin/format";
import {
  buildAdminOrderDetailHref,
  type AdminOrdersListParams,
} from "@/lib/admin/orders-list-url";
import type { AdminOrderSummary } from "@/lib/admin/orders-shared";
import { formatOrderMoney, getAdminOrderStatusLabel } from "@/lib/admin/orders-shared";

type AdminOrdersTableProps = {
  orders: AdminOrderSummary[];
  showExportStatus?: boolean;
  listParams?: AdminOrdersListParams;
};

function ExportStatusBadge({ order }: { order: AdminOrderSummary }) {
  if (order.status !== "confirmed") return null;

  if (order.moysklad_order_id) {
    return (
      <Badge variant="outline" className="text-xs">
        Экспортирован
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs text-amber-800">
      Ожидает экспорта
    </Badge>
  );
}

export function AdminOrdersTable({
  orders,
  showExportStatus = false,
  listParams = {},
}: AdminOrdersTableProps) {
  function orderHref(orderNumber: string): string {
    return buildAdminOrderDetailHref(orderNumber, listParams);
  }

  const columns: AdminDataTableColumn<AdminOrderSummary>[] = [
    {
      id: "order_number",
      header: "Номер",
      sortValue: (order) => order.order_number,
      cell: (order) => (
        <Link href={orderHref(order.order_number)} className="font-medium text-primary hover:underline">
          {order.order_number}
        </Link>
      ),
    },
    {
      id: "customer",
      header: "Клиент",
      sortValue: (order) => order.customer_email ?? "",
      cell: (order) => <span className="text-muted-foreground">{order.customer_email ?? "—"}</span>,
    },
    {
      id: "status",
      header: "Статус",
      sortValue: (order) => order.status,
      cell: (order) => (
        <Badge variant={order.status === "canceled" ? "secondary" : "default"}>
          {getAdminOrderStatusLabel(order.status)}
        </Badge>
      ),
    },
    ...(showExportStatus
      ? [
          {
            id: "export",
            header: "МойСклад",
            cell: (order: AdminOrderSummary) => <ExportStatusBadge order={order} />,
          } satisfies AdminDataTableColumn<AdminOrderSummary>,
        ]
      : []),
    {
      id: "total",
      header: "Сумма",
      sortValue: (order) => order.total_cents,
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (order) => formatOrderMoney(order.total_cents, order.currency),
    },
    {
      id: "created_at",
      header: "Дата",
      sortValue: (order) => order.created_at,
      cell: (order) => (
        <span className="text-muted-foreground">
          {formatAdminDate(order.created_at) ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <AdminDataTable
      tableId="admin-orders"
      columns={columns}
      rows={orders}
      getRowId={(order) => order.id}
      stickyHeader
      density="compact"
      emptyState={
        <AdminEmptyState
          title="Заказов не найдено"
          description="Измените фильтры или поисковый запрос."
        />
      }
      renderMobileCard={(order) => (
        <AdminMobileCard key={order.id}>
          <div className="space-y-2">
            <Link
              href={orderHref(order.order_number)}
              className="text-base font-semibold text-primary hover:underline"
            >
              {order.order_number}
            </Link>
            <AdminMobileCardRow label="Клиент">
              <span className="font-normal text-muted-foreground">
                {order.customer_email ?? "—"}
              </span>
            </AdminMobileCardRow>
            <AdminMobileCardRow label="Статус">
              <span className="inline-flex flex-wrap items-center gap-2">
                <Badge variant={order.status === "canceled" ? "secondary" : "default"}>
                  {getAdminOrderStatusLabel(order.status)}
                </Badge>
                {showExportStatus ? <ExportStatusBadge order={order} /> : null}
              </span>
            </AdminMobileCardRow>
            <AdminMobileCardRow label="Сумма">
              {formatOrderMoney(order.total_cents, order.currency)}
            </AdminMobileCardRow>
            <AdminMobileCardRow label="Дата">
              <span className="font-normal text-muted-foreground">
                {formatAdminDate(order.created_at) ?? "—"}
              </span>
            </AdminMobileCardRow>
          </div>
        </AdminMobileCard>
      )}
    />
  );
}
