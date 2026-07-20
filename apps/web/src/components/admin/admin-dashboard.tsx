import Link from "next/link";



import type { DashboardSummary } from "@/lib/admin/types";

import type { MoySkladIntegrationStatus } from "@/lib/admin/integrations/moysklad";

import { formatPrice } from "@/lib/admin/catalog";

import { getAdminOrderStatusLabel } from "@/lib/admin/orders-shared";

import { siteConfig } from "@/lib/store/site-config";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";



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

  moyskladStatus?: MoySkladIntegrationStatus | null;

};



export function AdminDashboard({

  summary,

  pendingImports = 0,

  needsStylingCount = 0,

  needsColorPhotosCount = 0,

  moyskladStatus = null,

}: AdminDashboardProps) {

  const statusEntries = Object.entries(summary.orders_by_status);

  const actionItems = buildActionItems(
    pendingImports,
    needsStylingCount,
    needsColorPhotosCount,
    moyskladStatus,
  );



  return (

    <div className="space-y-6">

      <div>

        <h1 className="text-2xl font-semibold tracking-tight">Сводка</h1>

        <p className="text-sm text-muted-foreground">

          Операционные метрики магазина (только чтение).

        </p>

      </div>



      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

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



        <Card className="transition-colors hover:bg-muted/30">

          <Link href="/admin/integrations/moysklad/import" className="block">

            <CardHeader className="pb-2">

              <CardTitle className="text-sm font-medium text-muted-foreground">

                Очередь импорта

              </CardTitle>

            </CardHeader>

            <CardContent>

              <p className="text-3xl font-semibold">{pendingImports}</p>

              <p className="mt-1 text-xs text-primary">Без категории →</p>

            </CardContent>

          </Link>

        </Card>



        <Card className="transition-colors hover:bg-muted/30">

          <Link

            href="/admin/catalog?needs_styling=1&all=1"

            className="block"

          >

            <CardHeader className="pb-2">

              <CardTitle className="text-sm font-medium text-muted-foreground">

                Требует оформления

              </CardTitle>

            </CardHeader>

            <CardContent>

              <p className="text-3xl font-semibold">{needsStylingCount}</p>

              <p className="mt-1 text-xs text-primary">Без фото или черновик →</p>

            </CardContent>

          </Link>

        </Card>

      </div>



      {actionItems.length > 0 ? (

        <Card>

          <CardHeader>

            <CardTitle className="text-base">Требует внимания</CardTitle>

          </CardHeader>

          <CardContent>

            <ul className="space-y-2">

              {actionItems.map((item) => (

                <li

                  key={item.href + item.label}

                  className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm"

                >

                  <div className="min-w-0 space-y-0.5">

                    <Link href={item.href} className="font-medium text-primary hover:underline">

                      {item.label}

                    </Link>

                    <p className="text-xs text-muted-foreground">{item.description}</p>

                  </div>

                  {item.count !== undefined ? (

                    <Badge variant={item.variant === "destructive" ? "destructive" : "secondary"}>

                      {item.count}

                    </Badge>

                  ) : null}

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

