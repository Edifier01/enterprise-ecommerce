"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  bulkHideProductsAction,
  bulkShowProductsAction,
} from "@/app/actions/admin-moysklad";
import { useToast } from "@/components/store/ui/toast-provider";
import { Button } from "@/components/ui/button";

type AdminCatalogBulkToolbarProps = {
  selectedIds: ReadonlySet<string>;
  onClearSelection: () => void;
};

export function AdminCatalogBulkToolbar({
  selectedIds,
  onClearSelection,
}: AdminCatalogBulkToolbarProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (selectedIds.size === 0) {
    return null;
  }

  function runBulk(action: "hide" | "show") {
    setMessage(null);
    startTransition(async () => {
      const ids = [...selectedIds];
      const result =
        action === "hide"
          ? await bulkHideProductsAction(ids)
          : await bulkShowProductsAction(ids);

      if (result.error) {
        setMessage(result.error);
        showToast({ tone: "error", message: result.error });
        return;
      }

      if (result.message) {
        setMessage(result.message);
        showToast({
          tone: result.message.includes("Пропущено") ? "warning" : "success",
          message: result.message,
        });
      }

      onClearSelection();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-sm font-medium">Выбрано: {selectedIds.size}</p>
      <Button type="button" size="sm" disabled={pending} onClick={() => runBulk("hide")}>
        {pending ? "Скрытие…" : "Скрыть выбранные"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => runBulk("show")}
      >
        {pending ? "Публикация…" : "Показать выбранные"}
      </Button>
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
