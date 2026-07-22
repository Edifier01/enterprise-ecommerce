"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  startBulkAssignCategoryJobAction,
  startBulkPublishProductsJobAction,
} from "@/app/actions/admin-bulk-jobs";
import {
  assignMoySkladProductCategoryAction,
  hideProductAction,
} from "@/app/actions/admin-moysklad";
import { AdminBulkJobProgress } from "@/components/admin/admin-bulk-job-progress";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import {
  AdminMobileCard,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import { AdminCascadingCategorySelect } from "@/components/admin/catalog/admin-cascading-category-select";
import { AdminProductPrices } from "@/components/admin/catalog/admin-product-prices";
import { MoySkladBadge } from "@/components/admin/moysklad/moysklad-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCategory, AdminProduct } from "@/lib/admin/catalog-shared";
import { PRODUCT_STATUS_LABELS } from "@/lib/admin/catalog-shared";
import { getMerchandisingChecklistItems } from "@/lib/admin/merchandising-readiness";
import type { AdminBulkJob } from "@/lib/admin/bulk-jobs-shared";
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
  const items = getMerchandisingChecklistItems(product);

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

function getDefaultSku(product: AdminProduct): string {
  const defaultVariant = product.variants.find((variant) => variant.is_default) ?? product.variants[0];
  return defaultVariant?.sku ?? "—";
}

function ImportProductCategoryAssign({
  product,
  categories,
  disabled,
  canWrite,
  onDone,
}: {
  product: AdminProduct;
  categories: AdminCategory[];
  disabled: boolean;
  canWrite: boolean;
  onDone: (message: string | null) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [, startTransition] = useTransition();

  if (!canWrite) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex min-w-[12rem] flex-col gap-2">
      <AdminCascadingCategorySelect
        categories={categories}
        onValueChange={setCategoryId}
        disabled={disabled}
      />
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
    </div>
  );
}

function ImportProductActions({
  product,
  disabled,
  canWrite,
  importReturnPath,
  onDone,
}: {
  product: AdminProduct;
  disabled: boolean;
  canWrite: boolean;
  importReturnPath: string;
  onDone: (message: string | null) => void;
}) {
  const [, startTransition] = useTransition();
  const editHref = `/admin/catalog/${product.id}/edit?from=${encodeURIComponent(importReturnPath)}`;

  if (!canWrite) {
    return (
      <Link href={editHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        Просмотр
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={editHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
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
  );
}

function buildImportColumns(
  categories: AdminCategory[],
  canWrite: boolean,
  disabled: boolean,
  importReturnPath: string,
  onDone: (message: string | null) => void,
): AdminDataTableColumn<AdminProduct>[] {
  return [
    {
      id: "name",
      header: "Товар",
      sortValue: (product) => product.name,
      cell: (product) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{product.name}</span>
            <MoySkladBadge />
          </div>
          {product.erp_name && product.erp_name !== product.name ? (
            <span className="text-xs text-muted-foreground">MS: {product.erp_name}</span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {PRODUCT_STATUS_LABELS[product.status] ?? product.status}
          </span>
        </div>
      ),
    },
    {
      id: "sku",
      header: "SKU",
      sortValue: (product) => getDefaultSku(product),
      cell: (product) => <span className="font-mono text-xs">{getDefaultSku(product)}</span>,
    },
    {
      id: "prices",
      header: "Розница / опт",
      cell: (product) => <AdminProductPrices product={product} />,
    },
    {
      id: "merchandising",
      header: "Оформление",
      cell: (product) => <MerchandisingChecklist product={product} />,
    },
    {
      id: "category",
      header: "Категория",
      cell: (product) => (
        <ImportProductCategoryAssign
          product={product}
          categories={categories}
          disabled={disabled}
          canWrite={canWrite}
          onDone={onDone}
        />
      ),
    },
    {
      id: "actions",
      header: "Действия",
      cell: (product) => (
        <ImportProductActions
          product={product}
          disabled={disabled}
          canWrite={canWrite}
          importReturnPath={importReturnPath}
          onDone={onDone}
        />
      ),
    },
  ];
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
  const [activeJob, setActiveJob] = useState<AdminBulkJob | null>(null);
  const [activeJobTitle, setActiveJobTitle] = useState<string | null>(null);
  const totalPages = getAdminTotalPages(total, pageSize);
  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const importReturnPath =
    page > 1 ? `/admin/integrations/moysklad/import?page=${page}` : "/admin/integrations/moysklad/import";

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(products.map((product) => product.id)));
  }

  function handleBulkAssign() {
    startTransition(async () => {
      const result = await startBulkAssignCategoryJobAction([...selectedIds], bulkCategoryId);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      if (result.job) {
        setActiveJob(result.job);
        setActiveJobTitle("Назначение категории");
        setMessage(null);
        setSelectedIds(new Set());
        setBulkCategoryId("");
      }
    });
  }

  function handleBulkPublish() {
    startTransition(async () => {
      const result = await startBulkPublishProductsJobAction([...selectedIds]);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      if (result.job) {
        setActiveJob(result.job);
        setActiveJobTitle("Публикация товаров");
        setMessage(null);
        setSelectedIds(new Set());
      }
    });
  }

  function handleJobComplete(job: AdminBulkJob) {
    setMessage(job.result_message ?? (job.status === "failed" ? "Массовая операция завершилась с ошибкой." : null));
    setActiveJob(null);
    setActiveJobTitle(null);
    router.refresh();
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

  const columns = useMemo(
    () => buildImportColumns(categories, canWrite, pending, importReturnPath, handleDone),
    [categories, canWrite, pending, importReturnPath],
  );

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

      {canWrite && products.length > 0 ? (
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

      {activeJob && activeJobTitle ? (
        <AdminBulkJobProgress
          job={activeJob}
          title={activeJobTitle}
          onComplete={handleJobComplete}
        />
      ) : null}

      <AdminDataTable
        tableId="admin-moysklad-import"
        columns={columns}
        rows={products}
        getRowId={(product) => product.id}
        stickyHeader
        density="compact"
        minWidthClassName="min-w-[960px]"
        selectable={canWrite}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyState={
          <AdminEmptyState
            title="Очередь импорта пуста"
            description="Нет товаров, ожидающих категорию. Запустите импорт на странице интеграции."
            action={{ label: "Интеграция МойСклад", href: "/admin/integrations/moysklad" }}
          />
        }
        renderMobileCard={(product) => (
          <AdminMobileCard key={product.id}>
            <div className="space-y-3">
              {canWrite ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => {
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (next.has(product.id)) next.delete(product.id);
                        else next.add(product.id);
                        return next;
                      });
                    }}
                    disabled={pending}
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
              <AdminMobileCardRow label="SKU">{getDefaultSku(product)}</AdminMobileCardRow>
              <AdminMobileCardRow label="Розница / опт">
                <AdminProductPrices product={product} />
              </AdminMobileCardRow>
              <AdminMobileCardRow label="Статус">
                {PRODUCT_STATUS_LABELS[product.status] ?? product.status}
              </AdminMobileCardRow>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Оформление</p>
                <MerchandisingChecklist product={product} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Категория</p>
                <ImportProductCategoryAssign
                  product={product}
                  categories={categories}
                  disabled={pending}
                  canWrite={canWrite}
                  onDone={handleDone}
                />
              </div>
              <ImportProductActions
                product={product}
                disabled={pending}
                canWrite={canWrite}
                importReturnPath={importReturnPath}
                onDone={handleDone}
              />
            </div>
          </AdminMobileCard>
        )}
      />

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />

      {total > 0 ? (
        <p className="text-center text-sm text-muted-foreground">Всего в очереди: {total}</p>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
