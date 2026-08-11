import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminBulkToolbarProps = {
  selectedCount: number;
  onClearSelection: () => void;
  pending?: boolean;
  children: ReactNode;
  message?: string | null;
  className?: string;
};

export function AdminBulkToolbar({
  selectedCount,
  onClearSelection,
  pending = false,
  children,
  message,
  className,
}: AdminBulkToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3",
        className,
      )}
    >
      <p className="text-sm font-medium">Выбрано: {selectedCount}</p>
      {children}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={onClearSelection}
      >
        Снять выбор
      </Button>
      {message ? (
        <p className="w-full text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
