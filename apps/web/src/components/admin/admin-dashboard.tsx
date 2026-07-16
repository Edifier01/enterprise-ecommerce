import Link from "next/link";

import type { DashboardSummary } from "@/lib/admin/types";
import { formatPrice } from "@/lib/admin/catalog";
import { getAdminOrderStatusLabel } from "@/lib/admin/orders-shared";
import { siteConfig } from "@/lib/store/site-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const FILTERABLE_ORDER_STATUSES = new Set(["confirmed", "shipped", "canceled"]);

function orderStatusHref(status: string): string | null {
  if (!FILTERABLE_ORDER_STATUSES.has(status)) {
    return null;
  }
  return `/admin/orders?status=${status}`;
}

type AdminDashboardProps = {
  summary: DashboardSummary;
};

export function AdminDashboard({ summary }: AdminDashboardProps) {
  const statusEntries = Object.entries(summary.orders_by_status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Сводка</h1>
        <p className="text-sm text-muted-foreground">
          Операционные метрики магазина (только чтение).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Заказы сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.orders_today}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Заказы за 7 дней
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.orders_last_7_days}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Выручка за 7 дней
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {formatPrice(summary.revenue_last_7_days_cents, siteConfig.defaultCurrency)}
            </p>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-muted/30">
          <Link href="/admin/inventory?low_stock=true" className="block">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Низкий остаток
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{summary.low_stock_count}</p>
              <p className="mt-1 text-xs text-primary">Перейти на склад →</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Заказы по статусам</CardTitle>
        </CardHeader>
        <CardContent>
          {statusEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Заказов пока нет.</p>
          ) : (
            <ul className="space-y-2">
              {statusEntries.map(([status, count]) => {
                const href = orderStatusHref(status);
                const label = getAdminOrderStatusLabel(status);

                return (
                  <li
                    key={status}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    {href ? (
                      <Link href={href} className="font-medium text-primary hover:underline">
                        {label}
                      </Link>
                    ) : (
                      <span className="font-medium">{label}</span>
                    )}
                    <span className="text-muted-foreground">{count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
