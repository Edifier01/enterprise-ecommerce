import Link from "next/link";
import { CheckCircle2, ClipboardList } from "lucide-react";

import type { MoySkladIntegrationStatus } from "@/lib/admin/integrations/moysklad";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AdminActionItem = {
  label: string;
  description: string;
  href: string;
  count?: number;
  variant?: "default" | "destructive";
};

export function buildAdminActionItems(
  pendingImports: number,
  needsStylingCount: number,
  needsColorPhotosCount: number,
  lowStockProducts: number,
  moyskladStatus: MoySkladIntegrationStatus | null,
): AdminActionItem[] {
  const items: AdminActionItem[] = [];

  if (pendingImports > 0) {
    items.push({
      label: "Импорт",
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

export function formatAdminAttentionLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${count} задача требует внимания`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} задачи требуют внимания`;
  }
  return `${count} задач требуют внимания`;
}

export function formatAdminGreetingName(email: string): string {
  const local = email.split("@")[0]?.trim();
  return local || email;
}

type AdminActionCenterProps = {
  items: AdminActionItem[];
};

export function AdminActionCenter({ items }: AdminActionCenterProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          {items.length > 0 ? (
            <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          )}
          <CardTitle className="text-base">Требует внимания</CardTitle>
          {items.length > 0 ? (
            <Badge variant="secondary" className="ml-auto tabular-nums">
              {items.length}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length > 0 ? (
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
            {items.map((item) => (
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
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">Критичных задач нет</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Импорт, оформление и остатки в норме. Можно работать с каталогом или заказами.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/admin/catalog?all=1"
                className="inline-flex min-h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
              >
                Каталог
              </Link>
              <Link
                href="/admin/orders"
                className="inline-flex min-h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
              >
                Заказы
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
