import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  ClipboardList,
  ImageIcon,
  PackageOpen,
  ShoppingBag,
} from "lucide-react";

import type { AdminInventoryOverview } from "@/lib/admin/inventory-shared";
import type { DashboardSummary } from "@/lib/admin/types";
import type { MoySkladIntegrationStatus } from "@/lib/admin/integrations/moysklad";
import { formatPrice } from "@/lib/admin/catalog";
import { getAdminOrderStatusLabel } from "@/lib/admin/orders-shared";
import { siteConfig } from "@/lib/store/site-config";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FILTERABLE_ORDER_STATUSES = new Set(["confirmed", "shipped", "canceled"]);

function orderStatusHref(status: string): string | null {
  if (!FILTERABLE_ORDER_STATUSES.has(status)) {
    return null;
  }
  return `/admin/orders?status=${status}`;
}

type ActionItem = {
  label: string;
  description: string;
  href: string;
  count?: number;
  variant?: "default" | "destructive";
};

function buildActionItems(
  pendingImports: number,
  needsStylingCount: number,
  needsColorPhotosCount: number,
  lowStockProducts: number,
  moyskladStatus: MoySkladIntegrationStatus | null,
): ActionItem[] {
  const items: ActionItem[] = [];

  if (pendingImports > 0) {
    items.push({
      label: "Очередь импорта",
      description: `${pendingImports} товар(ов) без категории`,
      href: "/admin/integrations/moysklad/import",
      count: pendingImports,
    });
  }

  if (needsStylingCount > 0) {
    items.push({
      label: "Требует оформления",
      description: `${needsStylingCount} без фото или в черновике`,
      href: "/admin/catalog?needs_styling=1&all=1",
      count: needsStylingCount,
    });
  }

  if (needsColorPhotosCount > 0) {
    items.push({
      label: "Фото по цветам",
      description: `${needsColorPhotosCount} товар(ов) с неполной галереей по цветам`,
      href: "/admin/catalog?needs_color_photos=1&all=1",
      count: needsColorPhotosCount,
    });
  }

  if (lowStockProducts > 0) {
    items.push({
      label: "Низкий остаток",
      description: `${lowStockProducts} товар(ов) с низким остатком`,
      href: "/admin/inventory?low_stock=true&group_by=product",
      count: lowStockProducts,
    });
  }

  if (moyskladStatus) {
    if (moyskladStatus.pending_order_exports > 0) {
      items.push({
        label: "Экспорт заказов",
        description: `${moyskladStatus.pending_order_exports} заказ(ов) ожидают выгрузки в МойСклад`,
        href: "/admin/orders?export_pending=1",
        count: moyskladStatus.pending_order_exports,
      });
    }

    if (moyskladStatus.errors_last_24h > 0 || moyskladStatus.last_error) {
      items.push({
        label: "Ошибки синхронизации",
        description:
          moyskladStatus.last_error ??
          `${moyskladStatus.errors_last_24h} ошибок за последние 24 ч`,
        href: "/admin/integrations/moysklad",
        count: moyskladStatus.errors_last_24h > 0 ? moyskladStatus.errors_last_24h : undefined,
        variant: "destructive",
      });
    }
  }

  return items;
}

type AdminDashboardProps = {
  summary: DashboardSummary;
  pendingImports?: number;
  needsStylingCount?: number;
  needsColorPhotosCount?: number;
  inventoryOverview?: AdminInventoryOverview | null;
  moyskladStatus?: MoySkladIntegrationStatus | null;
};

export function AdminDashboard({
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
  const actionItems = buildActionItems(
    pendingImports,
    needsStylingCount,
    needsColorPhotosCount,
    inventoryOverview?.low_stock_products ?? 0,
    moyskladStatus,
  );

  const lowStockDescription = inventoryOverview
    ? `${lowStockVariants} вариантов · порог ${inventoryOverview.low_stock_threshold}\nПо товарам →`
    : undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Сводка"
        description="Операционные метрики магазина (только чтение)."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <AdminKpiCard
          label="Заказы сегодня"
          value={summary.orders_today}
          icon={<ShoppingBag aria-hidden="true" />}
        />
        <AdminKpiCard
          label="Заказы за 7 дней"
          value={summary.orders_last_7_days}
          icon={<CalendarDays aria-hidden="true" />}
        />
        <AdminKpiCard
          label="Выручка за 7 дней"
          value={formatPrice(summary.revenue_last_7_days_cents, siteConfig.defaultCurrency)}
          icon={<Banknote aria-hidden="true" />}
        />
        <AdminKpiCard
          label="Низкий остаток"
          value={lowStockProducts}
          description={lowStockDescription}
          href="/admin/inventory?low_stock=true&group_by=product"
          variant={lowStockProducts > 0 ? "warning" : "default"}
          icon={<AlertTriangle aria-hidden="true" />}
        />
        <AdminKpiCard
          label="Очередь импорта"
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
      </div>

      {actionItems.length > 0 ? (
        <Card>
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
              <CardTitle className="text-base">Требует внимания</CardTitle>
              <Badge variant="secondary" className="ml-auto tabular-nums">
                {actionItems.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
              {actionItems.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-start justify-between gap-4 px-4 py-3.5 text-sm transition-colors hover:bg-muted/40",
                      item.variant === "destructive" &&
                        "border-l-2 border-l-destructive bg-destructive/5 hover:bg-destructive/10",
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    {item.count !== undefined ? (
                      <Badge
                        variant={item.variant === "destructive" ? "destructive" : "secondary"}
                        className="shrink-0 tabular-nums"
                      >
                        {item.count}
                      </Badge>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

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
