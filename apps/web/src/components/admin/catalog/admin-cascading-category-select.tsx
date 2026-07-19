"use client";

import { useState } from "react";

import { AdminCategorySelect } from "@/components/admin/catalog/admin-category-select";
import type { AdminCategory } from "@/lib/admin/catalog-shared";
import {
  categoryHasChildren,
  getChildCategories,
  resolveEffectiveCategoryId,
} from "@/lib/admin/category-options";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminCascadingCategorySelectProps = {
  categories: AdminCategory[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  parentEmptyLabel?: string;
  subcategoryEmptyLabel?: string;
};

export function AdminCascadingCategorySelect({
  categories,
  onValueChange,
  disabled = false,
  parentEmptyLabel = "Выберите категорию",
  subcategoryEmptyLabel = "Выберите подкатегорию",
}: AdminCascadingCategorySelectProps) {
  const [parentId, setParentId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  const hasSubcategories = parentId ? categoryHasChildren(categories, parentId) : false;
  const subcategories = hasSubcategories ? getChildCategories(categories, parentId) : [];

  function handleParentChange(nextParentId: string) {
    setParentId(nextParentId);
    setSubcategoryId("");
    onValueChange(resolveEffectiveCategoryId(categories, nextParentId, ""));
  }

  function handleSubcategoryChange(nextSubcategoryId: string) {
    setSubcategoryId(nextSubcategoryId);
    onValueChange(resolveEffectiveCategoryId(categories, parentId, nextSubcategoryId));
  }

  return (
    <div className="flex min-w-[12rem] flex-col gap-2">
      <AdminCategorySelect
        categories={categories}
        value={parentId}
        onValueChange={handleParentChange}
        defaultValue=""
        emptyLabel={parentEmptyLabel}
        rootsOnly
        disabled={disabled}
      />
      {hasSubcategories ? (
        <select
          value={subcategoryId}
          onChange={(event) => handleSubcategoryChange(event.target.value)}
          disabled={disabled}
          className={selectClass}
        >
          <option value="">{subcategoryEmptyLabel}</option>
          {subcategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
