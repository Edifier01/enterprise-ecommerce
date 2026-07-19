"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  assignMoySkladProductCategoryAction,
  hideProductAction,
} from "@/app/actions/admin-moysklad";
import { AdminCategorySelect } from "@/components/admin/catalog/admin-category-select";
import { MoySkladBadge } from "@/components/admin/moysklad/moysklad-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCategory, AdminProduct } from "@/lib/admin/catalog-shared";
import { formatPrice } from "@/lib/admin/catalog-shared";
import { cn } from "@/lib/utils";

type MoySkladImportPanelProps = {
  products: AdminProduct[];
  categories: AdminCategory[];
  total: number;
  page: number;
  pageSize: number;
};

export function MoySkladImportPanel({
  products,
  categories,
  total,
  page,
  pageSize,
}: MoySkladImportPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Очередь импорта</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Товары из МойСклад без категории скрыты с витрины. Назначьте категорию, добавьте фото
            на странице редактирования и опубликуйте товар (статус «Активен»).
          </p>
          <p>
            На витрине «нет в наличии», если доступный остаток меньше 3 шт.
          </p>
        </CardContent>
      </Card>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Нет товаров, ожидающих категорию. Запустите импорт на{" "}
            <Link href="/admin/integrations/moysklad" className="text-foreground underline">
              странице интеграции
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3">Товар</th>
                    <th className="px-4 py-3">SKU / цена</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Категория</th>
                    <th className="px-4 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <ImportRow
                      key={product.id}
                      product={product}
                      categories={categories}
                      disabled={pending}
                      onDone={(text) => {
                        setMessage(text);
                        router.refresh();
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/integrations/moysklad/import?page=${page - 1}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              ← Назад
            </Link>
          ) : null}
          <span className="text-sm text-muted-foreground">
            Страница {page} из {totalPages} ({total} товаров)
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/integrations/moysklad/import?page=${page + 1}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Вперёд →
            </Link>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function ImportRow({
  product,
  categories,
  disabled,
  onDone,
}: {
  product: AdminProduct;
  categories: AdminCategory[];
  disabled: boolean;
  onDone: (message: string | null) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [, startTransition] = useTransition();
  const defaultVariant = product.variants.find((v) => v.is_default) ?? product.variants[0];

  return (
    <tr className="border-b border-border/60">
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{product.name}</span>
            <MoySkladBadge />
          </div>
          {product.erp_name && product.erp_name !== product.name ? (
            <span className="text-xs text-muted-foreground">MS: {product.erp_name}</span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs">{defaultVariant?.sku ?? "—"}</span>
          <span>{formatPrice(product.price_cents)}</span>
        </div>
      </td>
      <td className="px-4 py-3 capitalize">{product.status}</td>
      <td className="px-4 py-3 min-w-[12rem]">
        <AdminCategorySelect
          name={`category_${product.id}`}
          categories={categories}
          value={categoryId}
          onValueChange={setCategoryId}
          defaultValue=""
          emptyLabel="Выберите категорию"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={disabled || !categoryId}
            onClick={() =>
              startTransition(async () => {
                const result = await assignMoySkladProductCategoryAction(product.id, categoryId);
                onDone(result.message ?? result.error ?? null);
              })
            }
          >
            Назначить
          </Button>
          <Link
            href={`/admin/catalog/${product.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Редактировать
          </Link>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              startTransition(async () => {
                const result = await hideProductAction(product.id);
                onDone(result.message ?? result.error ?? null);
              })
            }
          >
            Скрыть
          </Button>
        </div>
      </td>
    </tr>
  );
}
