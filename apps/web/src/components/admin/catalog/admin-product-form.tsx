"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createProductAction,
  type CatalogActionState,
} from "@/app/actions/admin-catalog";
import { AdminCategorySelect } from "@/components/admin/catalog/admin-category-select";
import { AdminImageField } from "@/components/admin/catalog/admin-image-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCategory } from "@/lib/admin/catalog-shared";
import { siteConfig } from "@/lib/store/site-config";

const initialState: CatalogActionState = {};

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClass =
  "min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function FieldError({
  fieldErrors,
  name,
}: {
  fieldErrors?: Record<string, string>;
  name: string;
}) {
  const message = fieldErrors?.[name];
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

type AdminProductFormProps = {
  categories: AdminCategory[];
  defaultCategoryId?: string;
};

export function AdminProductForm({ categories, defaultCategoryId }: AdminProductFormProps) {
  const [state, formAction, pending] = useActionState(createProductAction, initialState);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Новый товар</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label htmlFor="name" className="text-sm font-medium">
                Название
              </label>
              <input id="name" name="name" required className={inputClass} />
              <FieldError fieldErrors={state.fieldErrors} name="name" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug
              </label>
              <input id="slug" name="slug" required className={inputClass} />
              <FieldError fieldErrors={state.fieldErrors} name="slug" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="sku" className="text-sm font-medium">
                SKU
              </label>
              <input id="sku" name="sku" required className={inputClass} />
              <FieldError fieldErrors={state.fieldErrors} name="sku" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="price_rub" className="text-sm font-medium">
                Цена, ₽
              </label>
              <input
                id="price_rub"
                name="price_rub"
                type="number"
                min={0}
                step={1}
                required
                className={inputClass}
              />
              <FieldError fieldErrors={state.fieldErrors} name="price_cents" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="compare_at_price_rub" className="text-sm font-medium">
                Старая цена, ₽
              </label>
              <input
                id="compare_at_price_rub"
                name="compare_at_price_rub"
                type="number"
                min={0}
                step={1}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="wholesale_price_rub" className="text-sm font-medium">
                Опт, ₽
              </label>
              <input
                id="wholesale_price_rub"
                name="wholesale_price_rub"
                type="number"
                min={0}
                step={1}
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
              <AdminCategorySelect
                id="category_id"
                categories={categories}
                defaultValue={defaultCategoryId ?? ""}
              />
            </div>
            <div className="sm:col-span-2">
              <AdminImageField />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label htmlFor="description" className="text-sm font-medium">
                Описание
              </label>
              <textarea id="description" name="description" className={textareaClass} />
              <FieldError fieldErrors={state.fieldErrors} name="description" />
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
