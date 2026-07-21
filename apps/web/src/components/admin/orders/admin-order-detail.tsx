"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  updateOrderStatusAction,
  type OrderActionState,
} from "@/app/actions/admin-orders";
import {
  exportMoySkladOrderAction,
  type IntegrationActionState,
} from "@/app/actions/admin-moysklad";
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
  canExport?: boolean;
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

function ExportOrderForm({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [state, setState] = useState<IntegrationActionState>({});
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            const result = await exportMoySkladOrderAction(orderNumber);
            setState(result);
            if (result.success) {
              router.refresh();
            }
          })
        }
      >
        {pending ? "Экспорт…" : "Экспорт в МойСклад"}
      </Button>
      {state.error ? <p className="mt-2 text-xs text-destructive">{state.error}</p> : null}
      {state.success ? (
        <p className="mt-2 text-xs text-green-600">{state.message ?? "Экспортировано."}</p>
      ) : null}
    </div>
  );
}

export function AdminOrderDetail({ order, canWrite, canExport = false }: AdminOrderDetailProps) {
  const showShip = canWrite && order.status === "confirmed";
  const showCancel =
    canWrite && (order.status === "confirmed" || order.status === "shipped");
  const hasFulfillmentDetails =
    Boolean(order.customer_name) ||
    Boolean(order.customer_phone) ||
    Boolean(order.shipping_address);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Доставка и клиент
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Имя</dt>
              <dd className="mt-1 font-medium">{order.customer_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1">{order.customer_email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Телефон</dt>
              <dd className="mt-1">{order.customer_phone ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                {order.is_wholesaler ? "Юридический адрес (оптовик)" : "Адрес доставки"}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {order.shipping_address ?? "—"}
              </dd>
            </div>
          </dl>
          {!hasFulfillmentDetails && !order.is_wholesaler ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Адрес доставки не указан — проверьте данные checkout или уточните у клиента.
            </p>
          ) : null}
          {!hasFulfillmentDetails && order.is_wholesaler ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Для оптовиков доступны телефон и юридический адрес из профиля регистрации.
            </p>
          ) : null}
        </section>

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
          {order.customer_name ? (
            <div className="mb-3 flex justify-between gap-2">
              <span className="text-muted-foreground">Имя</span>
              <span className="text-right">{order.customer_name}</span>
            </div>
          ) : null}
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
          {order.discount_cents > 0 ? (
            <div className="mb-3 flex justify-between">
              <span className="text-muted-foreground">Скидка</span>
              <span>-{formatOrderMoney(order.discount_cents, order.currency)}</span>
            </div>
          ) : null}
          {order.shipping_cents > 0 ? (
            <div className="mb-3 flex justify-between">
              <span className="text-muted-foreground">Доставка</span>
              <span>{formatOrderMoney(order.shipping_cents, order.currency)}</span>
            </div>
          ) : null}
          {order.tax_cents > 0 ? (
            <div className="mb-3 flex justify-between">
              <span className="text-muted-foreground">Налог</span>
              <span>{formatOrderMoney(order.tax_cents, order.currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-3 font-medium">
            <span>Итого</span>
            <span>{formatOrderMoney(order.total_cents, order.currency)}</span>
          </div>
        </section>

        {(showShip || showCancel || (canExport && !order.moysklad_order_id && order.status === "confirmed")) && (
          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-3 text-sm font-medium">Действия</h2>
            <div className="flex flex-col gap-4">
              {canExport && !order.moysklad_order_id && order.status === "confirmed" ? (
                <ExportOrderForm orderNumber={order.order_number} />
              ) : null}
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
