import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminWorkflowQueueItem = {
  id: string;
  problem: string;
  detail: string;
  count: number;
  href: string;
  ctaLabel?: string;
  tone?: "default" | "warning" | "success";
  secondaryHref?: string;
  secondaryLabel?: string;
};

type AdminWorkflowActionQueueProps = {
  items: AdminWorkflowQueueItem[];
};

const toneRowClass: Record<NonNullable<AdminWorkflowQueueItem["tone"]>, string> = {
  default: "",
  warning: "border-l-2 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/15",
  success: "border-l-2 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/15",
};

export function AdminWorkflowActionQueue({ items }: AdminWorkflowActionQueueProps) {
  const actionable = items.filter((item) => item.count > 0);

  if (actionable.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
        <p className="text-sm font-medium text-foreground">Очереди merchandising пусты</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Нет товаров, требующих категорию, оформление или фото по цветам.
        </p>
        <Link
          href="/admin/catalog?all=1&status=active"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 inline-flex")}
        >
          Открыть опубликованные
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <h2 className="text-sm font-semibold">Требует действий</h2>
        <p className="text-xs text-muted-foreground">
          Приоритетные очереди — откройте список и выполните merchandising.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {actionable.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
              toneRowClass[item.tone ?? "default"],
            )}
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{item.problem}</span>
                <Badge variant="secondary" className="tabular-nums">
                  {item.count}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {item.secondaryHref && item.secondaryLabel ? (
                <Link
                  href={item.secondaryHref}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  {item.secondaryLabel}
                </Link>
              ) : null}
              <Link
                href={item.href}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                {item.ctaLabel ?? "Открыть очередь"}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
