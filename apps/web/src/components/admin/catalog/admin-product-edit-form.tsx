"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  updateProductAction,
  saveVariantWholesaleFormAction,
  type CatalogActionState,
} from "@/app/actions/admin-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCategory, AdminProduct } from "@/lib/admin/catalog";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminProductEditFormProps = {
  product: AdminProduct;
  categories: AdminCategory[];
};

export function AdminProductEditForm({ product, categories }: AdminProductEditFormProps) {
  const boundAction = updateProductAction.bind(null, product.id);
  const [state, formAction, pending] = useActionState<CatalogActionState, FormData>(
    boundAction,
    {},
  );

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Редактирование товара</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label htmlFor="name" className="text-sm font-medium">
                Название
              </label>
              <input
                id="name"
                name="name"
                defaultValue={product.name}
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                defaultValue={product.slug}
                required
                className={inputClass}
              />
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
                defaultValue={product.price_cents}
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="status" className="text-sm font-medium">
                Статус
              </label>
              <select
                id="status"
                name="status"
                defaultValue={product.status}
                className={inputClass}
              >
                <option value="draft">Черновик</option>
                <option value="active">Активен</option>
                <option value="archived">Архив</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label htmlFor="category_id" className="text-sm font-medium">
                Категория
              </label>
              <select
                id="category_id"
                name="category_id"
                defaultValue={product.category_id ?? ""}
                className={inputClass}
              >
                <option value="">Без категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {product.variants.length > 0 && (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">Варианты (оптовая цена)</p>
              <ul className="mt-2 space-y-3">
                {product.variants.map((variant) => (
                  <li key={variant.id}>
                    <form
                      id={`variant-form-${variant.id}`}
                      action={saveVariantWholesaleFormAction.bind(null, variant.id)}
                      className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                    >
                      <span className="text-muted-foreground">
                        {variant.sku} — {variant.name} (розница: {variant.price_cents})
                      </span>
                      <label className="flex items-center gap-2 text-xs">
                        Опт (центы)
                        <input
                          name="wholesale_price_cents"
                          type="number"
                          min={0}
                          max={variant.price_cents}
                          defaultValue={variant.wholesale_price_cents ?? ""}
                          className={inputClass}
                        />
                      </label>
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
                      >
                        Сохранить опт
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение..." : "Сохранить"}
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
