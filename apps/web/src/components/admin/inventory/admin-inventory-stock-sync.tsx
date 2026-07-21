"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { pullMoySkladStockAction } from "@/app/actions/admin-moysklad";
import { Button } from "@/components/ui/button";

type AdminInventoryStockSyncProps = {
  canSync: boolean;
};

export function AdminInventoryStockSync({ canSync }: AdminInventoryStockSyncProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canSync) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await pullMoySkladStockAction();
            setMessage(result.message ?? result.error ?? null);
            router.refresh();
          })
        }
      >
        Обновить остатки
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
