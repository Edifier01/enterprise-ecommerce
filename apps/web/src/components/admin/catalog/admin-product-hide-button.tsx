"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { hideProductAction, showProductAction } from "@/app/actions/admin-moysklad";
import { useToast } from "@/components/store/ui/toast-provider";
import { Button } from "@/components/ui/button";
import type { AdminProduct } from "@/lib/admin/catalog-shared";
import { cn } from "@/lib/utils";

type AdminProductHideButtonProps = {
  productId: string;
  status: AdminProduct["status"];
  variant?: "button" | "toggle";
};

function isVisibleOnStorefront(status: AdminProduct["status"]): boolean {
  return status === "active";
}

export function AdminProductHideButton({
  productId,
  status,
  variant = "button",
}: AdminProductHideButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const visible = isVisibleOnStorefront(status);

  function runToggle(nextVisible: boolean) {
    setError(null);
    startTransition(async () => {
      const result = nextVisible
        ? await showProductAction(productId)
        : await hideProductAction(productId);
      if (result.error) {
        setError(result.error);
        showToast({ tone: "error", message: result.error });
        return;
      }
      if (result.message) {
        showToast({ tone: "success", message: result.message });
      }
      router.refresh();
    });
  }

  if (variant === "toggle") {
    return (
      <div className="inline-flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={visible}
            aria-label={visible ? "Скрыть с витрины" : "Показать на витрине"}
            disabled={pending}
            onClick={() => runToggle(!visible)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              visible ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-0 transition-transform",
                visible ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
          <span className="text-sm text-muted-foreground">{visible ? "Видим" : "Скрыт"}</span>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (visible) {
    return (
      <div className="inline-flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => runToggle(false)}
        >
          {pending ? "Скрытие…" : "Скрыть с витрины"}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => runToggle(true)}
      >
        {pending ? "Публикация…" : "Показать на витрине"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
