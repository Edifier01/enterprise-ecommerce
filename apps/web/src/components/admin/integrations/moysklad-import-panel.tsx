"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  assignMoySkladProductCategoryAction,
  bulkAssignMoySkladCategoryAction,
  bulkPublishMoySkladProductsAction,
  hideProductAction,
} from "@/app/actions/admin-moysklad";
import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import {
  AdminDesktopTable,
  AdminMobileCard,
  AdminMobileCardList,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import { AdminCascadingCategorySelect } from "@/components/admin/catalog/admin-cascading-category-select";
import { MoySkladBadge } from "@/components/admin/moysklad/moysklad-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCategory, AdminProduct } from "@/lib/admin/catalog-shared";
import { formatPrice, PRODUCT_STATUS_LABELS } from "@/lib/admin/catalog-shared";
import { getGalleryColorCoverage } from "@/lib/admin/gallery-color-coverage";
import { cn } from "@/lib/utils";

type MoySkladImportPanelProps = {
  products: AdminProduct[];
  categories: AdminCategory[];
  total: number;
  page: number;
  pageSize: number;
  canWrite?: boolean;
};

function MerchandisingChecklist({ product }: { product: AdminProduct }) {
  const colorCoverage = getGalleryColorCoverage(product);
  const hasPhoto =
    Boolean(product.image_url?.trim()) || product.images.length > 0;
  const colorPhotosDone =
    colorCoverage.colors.length < 2 || !colorCoverage.needsColorPhotos;

  const items = [
    { label: "Категория", done: Boolean(product.category_id) },
    { label: "Фото", done: hasPhoto },
    ...(colorCoverage.colors.length >= 2
      ? [{ label: "Цвета в галерее", done: colorPhotosDone }]
      : []),
    { label: "Опубликован", done: product.status === "active" },
  ];

  return (
    <ul className="space-y-1 text-xs text-muted-foreground" aria-label="Чеклист оформления">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden className={item.done ? "text-green-600" : undefined}>
            {item.done ? "☑" : "☐"}
          </span>
          <span className={item.done ? "text-foreground" : undefined}>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function MoySkladImportPanel({
  products,
  categories,
  total,
  page,
  pageSize,
  canWrite = false,
}: MoySkladImportPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const totalPages = getAdminTotalPages(total, pageSize);
  const allSelected = products.length > 0 && selectedIds.size === products.length;

  function toggleProduct(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(products.map((product) => product.id)));
  }

  function handleBulkAssign() {
    startTransition(async () => {
      const result = await bulkAssignMoySkladCategoryAction([...selectedIds], bulkCategoryId);
      setMessage(result.message ?? result.error ?? null);
      if (result.success) {
        setSelectedIds(new Set());
        setBulkCategoryId("");
        router.refresh();
      }
    });
  }

  function handleBulkPublish() {
    startTransition(async () => {
      const result = await bulkPublishMoySkladProductsAction([...selectedIds]);
      setMessage(result.message ?? result.error ?? null);
      if (result.success) {
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  }

  function buildHref(nextPage: number) {
    return nextPage > 1
      ? `/admin/integrations/moysklad/import?page=${nextPage}`
      : "/admin/integrations/moysklad/import";
  }

  function handleDone(text: string | null) {
    setMessage(text);
    router.refresh();
  }

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
          <p>На витрине «нет в наличии», если доступный остаток меньше 3 шт.</p>
          {!canWrite ? (
            <p className="text-foreground">Режим просмотра — назначение категорий недоступно.</p>
          ) : null}
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
        <>
          {canWrite ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Массовое назначение</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={pending}
                    aria-label="Выбрать все на странице"
                  />
                  Выбрано: {selectedIds.size}
                </label>
                <div className="min-w-[14rem] flex-1">
                  <AdminCascadingCategorySelect
                    categories={categories}
                    onValueChange={setBulkCategoryId}
                    disabled={pending}
                  />
                </div>
                <Button
                  type="button"
                  disabled={pending || selectedIds.size === 0 || !bulkCategoryId}
                  onClick={handleBulkAssign}
                >
                  {pending ? "Назначение…" : "Назначить выбранным"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || selectedIds.size === 0}
                  onClick={handleBulkPublish}
                >
                  {pending ? "Публикация…" : "Опубликовать выбранным"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <AdminMobileCardList>
            {products.map((product) => (
              <AdminMobileCard key={product.id}>
                <ImportProductContent
                  product={product}
                  categories={categories}
                  disabled={pending}
                  canWrite={canWrite}
                  selected={selectedIds.has(product.id)}
                  onToggleSelect={() => toggleProduct(product.id)}
                  onDone={handleDone}
                  layout="mobile"
                />
              </AdminMobileCard>
            ))}
          </AdminMobileCardList>

          <AdminDesktopTable className="rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  {canWrite ? (
                    <th scope="col" className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        disabled={pending}
                        aria-label="Выбрать все на странице"
                      />
                    </th>
                  ) : null}
                  <th scope="col" className="px-4 py-3">
                    Товар
                  </th>
                  <th scope="col" className="px-4 py-3">
                    SKU / цена
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Оформление
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Категория
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <ImportProductContent
                    key={product.id}
                    product={product}
                    categories={categories}
                    disabled={pending}
                    canWrite={canWrite}
                    selected={selectedIds.has(product.id)}
                    onToggleSelect={() => toggleProduct(product.id)}
                    onDone={handleDone}
                    layout="table"
                  />
                ))}
              </tbody>
            </table>
          </AdminDesktopTable>
        </>
      )}

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />

      {total > 0 ? (
        <p className="text-center text-sm text-muted-foreground">Всего в очереди: {total}</p>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function ImportProductContent({
  product,
  categories,
  disabled,
  canWrite,
  selected,
  onToggleSelect,
  onDone,
  layout,
}: {
  product: AdminProduct;
  categories: AdminCategory[];
  disabled: boolean;
  canWrite: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDone: (message: string | null) => void;
  layout: "mobile" | "table";
}) {
  const [categoryId, setCategoryId] = useState("");
  const [, startTransition] = useTransition();
  const defaultVariant = product.variants.find((variant) => variant.is_default) ?? product.variants[0];
  const statusLabel = PRODUCT_STATUS_LABELS[product.status] ?? product.status;

  const actions = canWrite ? (
    <div className={cn("flex flex-wrap gap-2", layout === "mobile" && "pt-1")}>
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
        href={`/admin/catalog/${product.id}/edit`}
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
  ) : (
    <div className={cn("flex flex-wrap gap-2", layout === "mobile" && "pt-1")}>
      <Link
        href={`/admin/catalog/${product.id}/edit`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Просмотр
      </Link>
    </div>
  );

  const categorySelect = canWrite ? (
    <AdminCascadingCategorySelect
      categories={categories}
      onValueChange={setCategoryId}
      disabled={disabled}
    />
  ) : (
    <span className="text-muted-foreground">—</span>
  );

  const checklist = <MerchandisingChecklist product={product} />;

  if (layout === "mobile") {
    return (
      <div className="space-y-3">
        {canWrite ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              disabled={disabled}
              aria-label={`Выбрать ${product.name}`}
            />
            Выбрать для массового назначения
          </label>
        ) : null}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium leading-snug">{product.name}</p>
            <MoySkladBadge />
          </div>
          {product.erp_name && product.erp_name !== product.name ? (
            <p className="text-xs text-muted-foreground">MS: {product.erp_name}</p>
          ) : null}
        </div>
        <AdminMobileCardRow label="SKU">{defaultVariant?.sku ?? "—"}</AdminMobileCardRow>
        <AdminMobileCardRow label="Цена">{formatPrice(product.price_cents)}</AdminMobileCardRow>
        <AdminMobileCardRow label="Статус">{statusLabel}</AdminMobileCardRow>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Оформление</p>
          {checklist}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Категория</p>
          {categorySelect}
        </div>
        {actions}
      </div>
    );
  }

  return (
    <tr className="border-b border-border/60 align-top">
      {canWrite ? (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            disabled={disabled}
            aria-label={`Выбрать ${product.name}`}
          />
        </td>
      ) : null}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{product.name}</span>
            <MoySkladBadge />
          </div>
          {product.erp_name && product.erp_name !== product.name ? (
            <span className="text-xs text-muted-foreground">MS: {product.erp_name}</span>
          ) : null}
          <span className="text-xs text-muted-foreground">{statusLabel}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs">{defaultVariant?.sku ?? "—"}</span>
          <span>{formatPrice(product.price_cents)}</span>
        </div>
      </td>
      <td className="px-4 py-3">{checklist}</td>
      <td className="min-w-[12rem] px-4 py-3">{categorySelect}</td>
      <td className="px-4 py-3">{actions}</td>
    </tr>
  );
}
