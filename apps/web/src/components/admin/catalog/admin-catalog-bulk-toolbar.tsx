"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  bulkAssignMoySkladCategoryAction,
  bulkHideProductsAction,
  bulkPublishMoySkladProductsAction,
  bulkShowProductsAction,
} from "@/app/actions/admin-moysklad";
import { AdminBulkToolbar } from "@/components/admin/admin-bulk-toolbar";
import { AdminCascadingCategorySelect } from "@/components/admin/catalog/admin-cascading-category-select";
import { useToast } from "@/components/store/ui/toast-provider";
import { Button } from "@/components/ui/button";
import type { AdminCategory } from "@/lib/admin/catalog-shared";

type AdminCatalogBulkToolbarProps = {
  selectedIds: ReadonlySet<string>;
  categories: AdminCategory[];
  onClearSelection: () => void;
};

export function AdminCatalogBulkToolbar({
  selectedIds,
  categories,
  onClearSelection,
}: AdminCatalogBulkToolbarProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  function runBulk(action: "hide" | "show" | "assign" | "publish") {
    setMessage(null);
    startTransition(async () => {
      const ids = [...selectedIds];
      let result;

      if (action === "hide") {
        result = await bulkHideProductsAction(ids);
      } else if (action === "show") {
        result = await bulkShowProductsAction(ids);
      } else if (action === "assign") {
        result = await bulkAssignMoySkladCategoryAction(ids, bulkCategoryId);
      } else {
        result = await bulkPublishMoySkladProductsAction(ids);
      }

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
      setBulkCategoryId("");
      router.refresh();
    });
  }

  return (
    <AdminBulkToolbar
      selectedCount={selectedIds.size}
      onClearSelection={onClearSelection}
      pending={pending}
      message={message}
      className="sticky top-0 z-20"
    >
      <AdminCascadingCategorySelect
        categories={categories}
        onValueChange={setBulkCategoryId}
        disabled={pending}
        parentEmptyLabel="Категория"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || !bulkCategoryId}
        onClick={() => runBulk("assign")}
      >
        {pending ? "Назначение…" : "Назначить категорию"}
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => runBulk("publish")}
      >
        {pending ? "Публикация…" : "Опубликовать"}
      </Button>
      <Button type="button" size="sm" disabled={pending} onClick={() => runBulk("hide")}>
        {pending ? "Скрытие…" : "Скрыть"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => runBulk("show")}
      >
        {pending ? "Публикация…" : "Показать"}
      </Button>
    </AdminBulkToolbar>
  );
}
