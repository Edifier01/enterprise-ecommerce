"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  quickAssignProductCategoryAction,
  quickUpdateProductStatusAction,
} from "@/app/actions/admin-moysklad";
import { AdminCategorySelect } from "@/components/admin/catalog/admin-category-select";
import { useToast } from "@/components/store/ui/toast-provider";
import type { AdminCategory } from "@/lib/admin/catalog-shared";
import { PRODUCT_STATUS_LABELS } from "@/lib/admin/catalog-shared";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["draft", "active", "archived"] as const;

const selectClass =
  "h-8 min-w-[7.5rem] max-w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

type AdminCatalogStatusQuickEditProps = {
  productId: string;
  status: string;
  disabled?: boolean;
};

export function AdminCatalogStatusQuickEdit({
  productId,
  status,
  disabled = false,
}: AdminCatalogStatusQuickEditProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(status);

  function handleChange(nextStatus: string) {
    if (nextStatus === value) {
      return;
    }

    const previous = value;
    setValue(nextStatus);
    startTransition(async () => {
      const result = await quickUpdateProductStatusAction(productId, nextStatus);
      if (result.error) {
        setValue(previous);
        showToast({ tone: "error", message: result.error });
        return;
      }

      if (result.message) {
        showToast({ tone: "success", message: result.message });
      }
      router.refresh();
    });
  }

  return (
    <select
      value={value}
      disabled={disabled || pending}
      aria-label="Статус товара"
      className={cn(selectClass, pending && "opacity-60")}
      onChange={(event) => handleChange(event.target.value)}
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {PRODUCT_STATUS_LABELS[option] ?? option}
        </option>
      ))}
    </select>
  );
}

type AdminCatalogCategoryQuickEditProps = {
  productId: string;
  categoryId: string | null;
  categories: AdminCategory[];
  disabled?: boolean;
};

export function AdminCatalogCategoryQuickEdit({
  productId,
  categoryId,
  categories,
  disabled = false,
}: AdminCatalogCategoryQuickEditProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(categoryId ?? "");

  function handleChange(nextCategoryId: string) {
    if (nextCategoryId === value) {
      return;
    }

    const previous = value;
    setValue(nextCategoryId);
    startTransition(async () => {
      const result = await quickAssignProductCategoryAction(
        productId,
        nextCategoryId || null,
      );
      if (result.error) {
        setValue(previous);
        showToast({ tone: "error", message: result.error });
        return;
      }

      if (result.message) {
        showToast({ tone: "success", message: result.message });
      }
      router.refresh();
    });
  }

  return (
    <AdminCategorySelect
      categories={categories}
      value={value}
      onValueChange={handleChange}
      allowEmpty
      emptyLabel="Без категории"
      disabled={disabled || pending}
    />
  );
}
