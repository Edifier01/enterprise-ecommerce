import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { AdminOrderSummary } from "@/lib/admin/orders-shared";
import { formatOrderMoney } from "@/lib/admin/orders-shared";

type AdminOrdersTableProps = {
  orders: AdminOrderSummary[];
  getStatusLabel: (status: string) => string;
};

export function AdminOrdersTable({ orders, getStatusLabel }: AdminOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Заказов не найдено.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Номер</th>
            <th className="px-4 py-3 font-medium">Клиент</th>
            <th className="px-4 py-3 font-medium">Статус</th>
            <th className="px-4 py-3 font-medium">Сумма</th>
            <th className="px-4 py-3 font-medium">Дата</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-border/60">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/orders/${encodeURIComponent(order.order_number)}`}
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
    </div>
  );
}
