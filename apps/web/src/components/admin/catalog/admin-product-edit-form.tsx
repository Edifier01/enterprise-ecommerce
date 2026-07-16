"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";

import {
  updateProductAction,
  type CatalogActionState,
} from "@/app/actions/admin-catalog";
import { AdminCategorySelect } from "@/components/admin/catalog/admin-category-select";
import { AdminImageField } from "@/components/admin/catalog/admin-image-field";
import { AdminVariantPanel } from "@/components/admin/catalog/admin-variant-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCategory, AdminProduct } from "@/lib/admin/catalog";
import { centsToRubles } from "@/lib/admin/money";
import { siteConfig } from "@/lib/store/site-config";

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

  const imageSrc = product.image_url ?? siteConfig.images.productPlaceholder;

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Редактирование товара</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                className="object-cover"
                unoptimized={imageSrc.startsWith("http")}
              />
            </div>

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
                <FieldError fieldErrors={state.fieldErrors} name="name" />
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
                <FieldError fieldErrors={state.fieldErrors} name="slug" />
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
                  defaultValue={centsToRubles(product.price_cents)}
                  required
                  className={inputClass}
                />
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
                  defaultValue={
                    product.compare_at_price_cents != null
                      ? centsToRubles(product.compare_at_price_cents)
                      : ""
                  }
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
                <AdminCategorySelect
                  id="category_id"
                  categories={categories}
                  defaultValue={product.category_id ?? ""}
                />
              </div>
              <div className="sm:col-span-2">
                <AdminImageField
                  defaultValue={product.image_url ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Описание
                </label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={product.description ?? ""}
                  className={textareaClass}
                />
              </div>
            </div>

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

      <AdminVariantPanel product={product} />
    </div>
  );
}
