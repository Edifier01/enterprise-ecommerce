import { Badge } from "@/components/ui/badge";
import { PRODUCT_STATUS_LABELS } from "@/lib/admin/catalog-shared";
import { cn } from "@/lib/utils";

export type AdminStatusTone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASS: Record<AdminStatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  danger: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  neutral: "border-border bg-muted text-muted-foreground",
};

type AdminStatusBadgeProps = {
  label: string;
  tone?: AdminStatusTone;
  className?: string;
};

export function AdminStatusBadge({
  label,
  tone = "neutral",
  className,
}: AdminStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("font-normal", TONE_CLASS[tone], className)}>
      {label}
    </Badge>
  );
}

export function getProductStatusBadge(status: string): {
  label: string;
  tone: AdminStatusTone;
} {
  const label =
    PRODUCT_STATUS_LABELS[status as keyof typeof PRODUCT_STATUS_LABELS] ?? status;
  switch (status) {
    case "active":
      return { label, tone: "success" };
    case "draft":
      return { label, tone: "warning" };
    case "archived":
      return { label, tone: "neutral" };
    default:
      return { label, tone: "neutral" };
  }
}

export function getOrderStatusBadge(status: string): {
  label: string;
  tone: AdminStatusTone;
} {
  switch (status) {
    case "confirmed":
    case "shipped":
      return { label: status === "shipped" ? "Отправлен" : "Подтверждён", tone: "success" };
    case "pending":
      return { label: "Ожидает", tone: "warning" };
    case "canceled":
      return { label: "Отменён", tone: "neutral" };
    default:
      return { label: status, tone: "neutral" };
  }
}

export function getStockStatusBadge(available: number, lowThreshold = 3): {
  label: string;
  tone: AdminStatusTone;
} {
  if (available <= 0) {
    return { label: "Нет в наличии", tone: "danger" };
  }
  if (available < lowThreshold) {
    return { label: "Мало", tone: "warning" };
  }
  return { label: "В наличии", tone: "success" };
}

export function getExportStatusBadge(exported: boolean, pending: boolean): {
  label: string;
  tone: AdminStatusTone;
} {
  if (exported) {
    return { label: "Экспортирован", tone: "success" };
  }
  if (pending) {
    return { label: "Ожидает экспорт", tone: "warning" };
  }
  return { label: "—", tone: "neutral" };
}

export function getCustomerTypeBadge(isWholesaler: boolean): {
  label: string;
  tone: AdminStatusTone;
} {
  return isWholesaler
    ? { label: "Опт", tone: "success" }
    : { label: "Розница", tone: "neutral" };
}

export function AdminStockAvailabilityBadge({
  available,
  lowThreshold = 3,
  className,
}: {
  available: number;
  lowThreshold?: number;
  className?: string;
}) {
  const badge = getStockStatusBadge(available, lowThreshold);
  return <AdminStatusBadge label={badge.label} tone={badge.tone} className={className} />;
}

export function AdminOrderStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const badge = getOrderStatusBadge(status);
  return <AdminStatusBadge label={badge.label} tone={badge.tone} className={className} />;
}
