"use client";

import Link from "next/link";

import type { AdminCategory } from "@/lib/admin/catalog";
import { buildCategoryOptions } from "@/lib/admin/category-options";

type AdminCatalogCategoryPickerProps = {
  categories: AdminCategory[];
};

export function AdminCatalogCategoryPicker({ categories }: AdminCatalogCategoryPickerProps) {
  const options = buildCategoryOptions(categories);
  const totalProducts = categories.reduce((sum, category) => sum + category.product_count, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Выберите категорию, чтобы просмотреть и редактировать товары.
        </p>
        <Link
          href="/admin/catalog/categories"
          className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          + Категория
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const category = categories.find((item) => item.id === option.id);
          const count = category?.product_count ?? 0;
          return (
            <Link
              key={option.id}
              href={`/admin/catalog?category_id=${option.id}`}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
              style={{ paddingLeft: `${1 + option.depth * 0.75}rem` }}
            >
              <p className="font-medium">{option.label.replace(/^—\s*/, "")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {count}{" "}
                {count === 1 ? "товар" : count >= 2 && count <= 4 ? "товара" : "товаров"}
              </p>
            </Link>
          );
        })}

        <Link
          href="/admin/catalog?uncategorized=1"
          className="rounded-xl border border-dashed border-border bg-card p-4 transition-colors hover:bg-muted/40"
        >
          <p className="font-medium">Без категории</p>
          <p className="mt-1 text-sm text-muted-foreground">Товары без привязки к категории</p>
        </Link>

        <Link
          href="/admin/catalog?all=1"
          className="rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
        >
          <p className="font-medium">Все товары</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalProducts} в категориях · полный список
          </p>
        </Link>
      </div>
    </div>
  );
}
