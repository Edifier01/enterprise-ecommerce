import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  ImageIcon,
  PackageOpen,
  Palette,
  ShoppingBag,
} from "lucide-react";

import {
  AdminActionCenter,
  buildAdminActionItems,
  formatAdminAttentionLabel,
  formatAdminGreetingName,
} from "@/components/admin/admin-action-center";
import type { AdminInventoryOverview } from "@/lib/admin/inventory-shared";
import type { DashboardSummary } from "@/lib/admin/types";
import type { AdminUser } from "@/lib/admin/types";
import type { MoySkladIntegrationStatus } from "@/lib/admin/integrations/moysklad";
import { formatPrice } from "@/lib/admin/catalog";
import { getAdminOrderStatusLabel } from "@/lib/admin/orders-shared";
import { siteConfig } from "@/lib/store/site-config";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FILTERABLE_ORDER_STATUSES = new Set(["confirmed", "shipped", "canceled"]);

function orderStatusHref(status: string): string | null {
  if (!FILTERABLE_ORDER_STATUSES.has(status)) {
    return null;
  }
  return `/admin/orders?status=${status}`;
}

type AdminDashboardProps = {
  admin: AdminUser;
  summary: DashboardSummary;
  pendingImports?: number;
  needsStylingCount?: number;
  needsColorPhotosCount?: number;
  inventoryOverview?: AdminInventoryOverview | null;
  moyskladStatus?: MoySkladIntegrationStatus | null;
};

export function AdminDashboard({
  admin,
  summary,
  pendingImports = 0,
  needsStylingCount = 0,
  needsColorPhotosCount = 0,
  inventoryOverview = null,
  moyskladStatus = null,
}: AdminDashboardProps) {
  const statusEntries = Object.entries(summary.orders_by_status);
  const lowStockProducts = inventoryOverview?.low_stock_products ?? summary.low_stock_count;
  const lowStockVariants = inventoryOverview?.low_stock_variants ?? summary.low_stock_count;
  const actionItems = buildAdminActionItems(
    pendingImports,
    needsStylingCount,
    needsColorPhotosCount,
    inventoryOverview?.low_stock_products ?? 0,
    moyskladStatus,
  );

  const lowStockDescription = inventoryOverview
    ? `${lowStockVariants} вариантов · порог ${inventoryOverview.low_stock_threshold}\nПо товарам →`
    : undefined;

  const greetingName = formatAdminGreetingName(admin.email);
  const statusLine =
    actionItems.length > 0
      ? formatAdminAttentionLabel(actionItems.length)
      : "Критичных задач нет — можно работать с каталогом";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Сводка"
        description={
          <>
            Добрый день, {greetingName}. {statusLine}
          </>
        }
        actions={
          <>
            <Link
              href="/admin/catalog?all=1"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Каталог
            </Link>
            <Link
              href="/admin/orders"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Заказы
            </Link>
            <Link
              href="/admin/integrations/moysklad/import"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Импорт
            </Link>
          </>
        }
      />

      <AdminActionCenter items={actionItems} />

      <section aria-labelledby="dashboard-operations-heading" className="space-y-3">
        <h2
          id="dashboard-operations-heading"
          className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          Операции
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            label="Импорт"
            value={pendingImports}
            description="Без категории →"
            href="/admin/integrations/moysklad/import"
            variant={pendingImports > 0 ? "warning" : "default"}
            icon={<PackageOpen aria-hidden="true" />}
          />
          <AdminKpiCard
            label="Требует оформления"
            value={needsStylingCount}
            description="Без фото или черновик →"
            href="/admin/catalog?needs_styling=1&all=1"
            variant={needsStylingCount > 0 ? "warning" : "default"}
            icon={<ImageIcon aria-hidden="true" />}
          />
          <AdminKpiCard
            label="Фото по цветам"
            value={needsColorPhotosCount}
            description="Неполная галерея →"
            href="/admin/catalog?needs_color_photos=1&all=1"
            variant={needsColorPhotosCount > 0 ? "warning" : "default"}
            icon={<Palette aria-hidden="true" />}
          />
          <AdminKpiCard
            label="Низкий остаток"
            value={lowStockProducts}
            description={lowStockDescription}
            href="/admin/inventory?low_stock=true&group_by=product"
            variant={lowStockProducts > 0 ? "warning" : "default"}
            icon={<AlertTriangle aria-hidden="true" />}
          />
        </div>
      </section>

      <section aria-labelledby="dashboard-sales-heading" className="space-y-3">
        <h2
          id="dashboard-sales-heading"
          className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          Продажи
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminKpiCard
            label="Заказы сегодня"
            value={summary.orders_today}
            description="Открыть список →"
            href="/admin/orders"
            icon={<ShoppingBag aria-hidden="true" />}
          />
          <AdminKpiCard
            label="Заказы за 7 дней"
            value={summary.orders_last_7_days}
            description="Открыть список →"
            href="/admin/orders"
            icon={<CalendarDays aria-hidden="true" />}
          />
          <AdminKpiCard
            label="Выручка за 7 дней"
            value={formatPrice(summary.revenue_last_7_days_cents, siteConfig.defaultCurrency)}
            description="Открыть заказы →"
            href="/admin/orders"
            icon={<Banknote aria-hidden="true" />}
          />
        </div>
      </section>

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
                    <span className="text-muted-foreground tabular-nums">{count}</span>
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
