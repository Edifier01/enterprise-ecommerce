import Link from "next/link";

import {
  AdminDesktopTable,
  AdminMobileCard,
  AdminMobileCardList,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import { Badge } from "@/components/ui/badge";
import type { AdminOrderSummary } from "@/lib/admin/orders-shared";
import { formatOrderMoney } from "@/lib/admin/orders-shared";

type AdminOrdersTableProps = {
  orders: AdminOrderSummary[];
  getStatusLabel: (status: string) => string;
  showExportStatus?: boolean;
  buildOrderHref?: (orderNumber: string) => string;
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
  getStatusLabel,
  showExportStatus = false,
  buildOrderHref,
}: AdminOrdersTableProps) {
  function orderHref(orderNumber: string): string {
    return buildOrderHref?.(orderNumber) ?? `/admin/orders/${encodeURIComponent(orderNumber)}`;
  }
  if (orders.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Заказов не найдено.
      </p>
    );
  }

  return (
    <>
      <AdminMobileCardList>
        {orders.map((order) => (
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
                    {getStatusLabel(order.status)}
                  </Badge>
                  {showExportStatus ? <ExportStatusBadge order={order} /> : null}
                </span>
              </AdminMobileCardRow>
              <AdminMobileCardRow label="Сумма">
                {formatOrderMoney(order.total_cents, order.currency)}
              </AdminMobileCardRow>
              <AdminMobileCardRow label="Дата">
                <span className="font-normal text-muted-foreground">
                  {new Date(order.created_at).toLocaleString("ru-RU")}
                </span>
              </AdminMobileCardRow>
            </div>
          </AdminMobileCard>
        ))}
      </AdminMobileCardList>

      <AdminDesktopTable className="rounded-lg">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Номер</th>
              <th className="px-4 py-3 font-medium">Клиент</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              {showExportStatus ? <th className="px-4 py-3 font-medium">МойСклад</th> : null}
              <th className="px-4 py-3 font-medium">Сумма</th>
              <th className="px-4 py-3 font-medium">Дата</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border/60">
                <td className="px-4 py-3">
                  <Link
                    href={orderHref(order.order_number)}
                    className="font-medium text-primary hover:underline"
                  >
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.customer_email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={order.status === "canceled" ? "secondary" : "default"}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </td>
                {showExportStatus ? (
                  <td className="px-4 py-3">
                    <ExportStatusBadge order={order} />
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  {formatOrderMoney(order.total_cents, order.currency)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(order.created_at).toLocaleString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminDesktopTable>
    </>
  );
}
