"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createProductAction,
  type CatalogActionState,
} from "@/app/actions/admin-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCategory } from "@/lib/admin/catalog";

const initialState: CatalogActionState = {};

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminProductFormProps = {
  categories: AdminCategory[];
  mode: "create";
};

export function AdminProductForm({ categories, mode }: AdminProductFormProps) {
  const [state, formAction, pending] = useActionState(createProductAction, initialState);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Новый товар" : "Редактирование товара"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label htmlFor="name" className="text-sm font-medium">
                Название
              </label>
              <input id="name" name="name" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug
              </label>
              <input id="slug" name="slug" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="sku" className="text-sm font-medium">
                SKU
              </label>
              <input id="sku" name="sku" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="price_cents" className="text-sm font-medium">
                Цена (копейки/центы)
              </label>
              <input
                id="price_cents"
                name="price_cents"
                type="number"
                min={0}
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="wholesale_price_cents" className="text-sm font-medium">
                Опт (центы, опционально)
              </label>
              <input
                id="wholesale_price_cents"
                name="wholesale_price_cents"
                type="number"
                min={0}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="status" className="text-sm font-medium">
                Статус
              </label>
              <select id="status" name="status" defaultValue="draft" className={inputClass}>
                <option value="draft">Черновик</option>
                <option value="active">Активен</option>
                <option value="archived">Архив</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label htmlFor="category_id" className="text-sm font-medium">
                Категория
              </label>
              <select id="category_id" name="category_id" defaultValue="" className={inputClass}>
                <option value="">Без категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение..." : "Создать"}
            </Button>
            <Link
              href="/admin/catalog"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
            >
              Отмена
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
