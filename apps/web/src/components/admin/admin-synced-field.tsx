import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const readOnlyValueClass =
  "min-h-9 w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground";

type AdminSyncedFieldProps = {
  label: string;
  value?: ReactNode;
  synced?: boolean;
  syncedLabel?: string;
  className?: string;
  children?: ReactNode;
};

export function AdminSyncedField({
  label,
  value,
  synced = false,
  syncedLabel = "Управляется МойСклад",
  className,
  children,
}: AdminSyncedFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children ?? (value != null ? <div className={readOnlyValueClass}>{value}</div> : null)}
      {synced ? (
        <p className="text-xs text-muted-foreground" aria-label={syncedLabel}>
          🔒 {syncedLabel}
        </p>
      ) : null}
    </div>
  );
}

export { readOnlyValueClass as adminReadOnlyValueClass };
