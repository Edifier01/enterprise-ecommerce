"use client";

import Link from "next/link";

import type { AdminCategory } from "@/lib/admin/catalog-shared";
import { buildCategoryOptions } from "@/lib/admin/category-options";

type AdminCatalogCategoryPickerProps = {
  categories: AdminCategory[];
  totalProductCount: number;
  canWrite?: boolean;
};

function formatProductCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} товар`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} товара`;
  return `${count} товаров`;
}

export function AdminCatalogCategoryPicker({
  categories,
  totalProductCount,
  canWrite = false,
}: AdminCatalogCategoryPickerProps) {
  const options = buildCategoryOptions(categories);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Выберите категорию, чтобы просмотреть товары из МойСклад.
        </p>
        {canWrite ? (
          <Link
            href="/admin/catalog/categories"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            + Категория
          </Link>
        ) : null}
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
          href="/admin/catalog?all=1"
          className="rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
        >
          <p className="font-medium">Все товары</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatProductCount(totalProductCount)} · поиск и фильтры
          </p>
        </Link>
      </div>
    </div>
  );
}
