"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { hideProductAction } from "@/app/actions/admin-moysklad";
import { Button } from "@/components/ui/button";

type AdminProductHideButtonProps = {
  productId: string;
  hidden?: boolean;
};

export function AdminProductHideButton({
  productId,
  hidden = false,
}: AdminProductHideButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (hidden) {
    return null;
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await hideProductAction(productId);
            if (result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
      >
        {pending ? "Скрытие…" : "Скрыть с витрины"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
