"use client";

import { useActionState } from "react";

import {
  updateOrderStatusAction,
  type OrderActionState,
} from "@/app/actions/admin-orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminOrderDetail } from "@/lib/admin/orders-shared";
import {
  formatOrderMoney,
  getAdminOrderStatusLabel,
} from "@/lib/admin/orders-shared";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminOrderDetailProps = {
  order: AdminOrderDetail;
  canWrite: boolean;
};

function StatusActionForm({
  orderNumber,
  status,
  label,
  variant,
  showReason,
}: {
  orderNumber: string;
  status: "shipped" | "canceled";
  label: string;
  variant: "default" | "destructive";
  showReason?: boolean;
}) {
  const boundAction = updateOrderStatusAction.bind(null, orderNumber);
  const [state, formAction, pending] = useActionState<OrderActionState, FormData>(
    boundAction,
    {},
  );

  return (
    <form action={formAction} className="flex min-w-[240px] flex-col gap-2">
      <input type="hidden" name="status" value={status} />
      {showReason && (
        <input
          name="reason"
          placeholder="Причина отмены (необязательно)"
          className={inputClass}
          aria-label="Причина отмены"
        />
      )}
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? "Сохранение…" : label}
      </Button>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state.success && <p className="text-xs text-green-600">{state.success}</p>}
    </form>
  );
}

export function AdminOrderDetail({ order, canWrite }: AdminOrderDetailProps) {
  const showShip = canWrite && order.status === "confirmed";
  const showCancel =
    canWrite && (order.status === "confirmed" || order.status === "shipped");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Позиции
          </h2>
          <ul className="divide-y divide-border">
            {order.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{line.product_snapshot.product_name}</p>
                  <p className="text-muted-foreground">
                    {line.product_snapshot.name} · SKU {line.product_snapshot.sku}
                  </p>
                  <p className="text-muted-foreground">× {line.quantity}</p>
                </div>
                <p className="shrink-0 font-medium">
                  {formatOrderMoney(line.line_total_cents, order.currency)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            История статусов
          </h2>
          <ul className="space-y-3 text-sm">
            {order.status_history.map((entry) => (
              <li key={entry.id} className="rounded-md bg-muted/30 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {getAdminOrderStatusLabel(entry.to_status)}
                  </Badge>
                  <span className="text-muted-foreground">{entry.changed_by}</span>
                  <span className="text-muted-foreground">
                    {new Date(entry.changed_at).toLocaleString("ru-RU")}
                  </span>
                </div>
                {entry.reason && (
                  <p className="mt-1 text-muted-foreground">{entry.reason}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-lg border border-border p-4 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-muted-foreground">Статус</span>
            <Badge>{getAdminOrderStatusLabel(order.status)}</Badge>
          </div>
          <div className="mb-3 flex justify-between">
            <span className="text-muted-foreground">Клиент</span>
            <span>{order.customer_email ?? "—"}</span>
          </div>
          <div className="mb-3 flex justify-between gap-2">
            <span className="text-muted-foreground">МойСклад</span>
            {order.moysklad_order_id ? (
              <a
                href={`https://online.moysklad.ru/app/#customerorder/edit?id=${order.moysklad_order_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Экспортирован ↗
              </a>
            ) : order.status === "confirmed" ? (
              <span className="text-amber-700">Ожидает экспорта</span>
            ) : (
              <span>—</span>
            )}
          </div>
          <div className="mb-3 flex justify-between">
            <span className="text-muted-foreground">Подытог</span>
            <span>{formatOrderMoney(order.subtotal_cents, order.currency)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-3 font-medium">
            <span>Итого</span>
            <span>{formatOrderMoney(order.total_cents, order.currency)}</span>
          </div>
        </section>

        {(showShip || showCancel) && (
          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-3 text-sm font-medium">Действия</h2>
            <div className="flex flex-col gap-4">
              {showShip && (
                <StatusActionForm
                  orderNumber={order.order_number}
                  status="shipped"
                  label="Отметить отправленным"
                  variant="default"
                />
              )}
              {showCancel && (
                <StatusActionForm
                  orderNumber={order.order_number}
                  status="canceled"
                  label="Отменить заказ"
                  variant="destructive"
                  showReason
                />
              )}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
