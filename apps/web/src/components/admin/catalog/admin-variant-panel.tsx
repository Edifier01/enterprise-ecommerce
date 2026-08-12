"use client";

import { useActionState } from "react";

import {
  createVariantAction,
  updateVariantAction,
  type CatalogActionState,
} from "@/app/actions/admin-catalog";
import {
  AdminSyncedField,
  adminReadOnlyValueClass,
} from "@/components/admin/admin-synced-field";
import { AdminStatusBadge, getStockStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { AdminVariantStock } from "@/components/admin/catalog/admin-product-stock";
import type { AdminProduct } from "@/lib/admin/catalog-shared";
import { formatPrice } from "@/lib/admin/catalog-shared";
import { getGalleryColorCoverage } from "@/lib/admin/gallery-color-coverage";
import { centsToRubles } from "@/lib/admin/money";
import { isMoySkladSynced } from "@/lib/admin/moysklad";
import { cn } from "@/lib/utils";

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const VARIANT_ATTR_LABELS: Record<string, string> = {
  size: "Размер",
  color: "Цвет",
  camouflage: "Камуфляж",
  waist: "Талия",
};

type AdminVariantPanelProps = {
  product: AdminProduct;
};

type VariantRow = AdminProduct["variants"][number];

function formatDimensions(dimensions: Record<string, number> | null | undefined): string | null {
  if (!dimensions) return null;
  const parts = ["length", "width", "height"]
    .map((key) => dimensions[key])
    .filter((value) => value != null);
  return parts.length > 0 ? parts.map((v) => `${v} см`).join(" × ") : null;
}

function formatVariantAttributes(attributes: Record<string, string> | undefined): string | null {
  if (!attributes) return null;
  const parts = Object.entries(attributes)
    .filter(([, value]) => value?.trim())
    .map(([key, value]) => `${VARIANT_ATTR_LABELS[key] ?? key}: ${value.trim()}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function attrValue(variant: VariantRow, key: string): string {
  return variant.attributes?.[key]?.trim() || "—";
}

function VariantMsSyncedFields({
  variant,
  currency,
}: {
  variant: VariantRow;
  currency: string;
}) {
  const attributes = formatVariantAttributes(variant.attributes);
  const dimensions = formatDimensions(variant.dimensions_cm);
  const stockBadge = getStockStatusBadge(variant.available ?? (variant.in_stock ? 1 : 0));

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border/80 bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Данные из МойСклад
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminSyncedField label="SKU" value={variant.sku} synced className="text-xs" />
        <AdminSyncedField
          label="Название"
          value={variant.name}
          synced
          className="text-xs sm:col-span-2"
        />
        <AdminSyncedField
          label="Розница, ₽"
          value={formatPrice(variant.price_cents, currency)}
          synced
          className="text-xs"
        />
        <AdminSyncedField
          label="Опт, ₽"
          value={
            variant.wholesale_price_cents != null
              ? formatPrice(variant.wholesale_price_cents, currency)
              : "—"
          }
          synced
          className="text-xs"
        />
        {attributes ? (
          <AdminSyncedField
            label="Атрибуты"
            value={attributes}
            synced
            className="text-xs sm:col-span-2"
          />
        ) : null}
        {variant.barcode ? (
          <AdminSyncedField
            label="Штрихкод"
            value={variant.barcode}
            synced
            className="text-xs"
          />
        ) : null}
        {variant.weight_grams != null ? (
          <AdminSyncedField
            label="Вес"
            value={`${variant.weight_grams} г`}
            synced
            className="text-xs"
          />
        ) : null}
        {dimensions ? (
          <AdminSyncedField
            label="Габариты"
            value={dimensions}
            synced
            className="text-xs sm:col-span-2"
          />
        ) : null}
        <AdminSyncedField
          label="Наличие на витрине"
          synced
          className="text-xs"
          value={<AdminStatusBadge label={stockBadge.label} tone={stockBadge.tone} />}
        />
        <AdminSyncedField
          label="Остатки на складе"
          synced
          className="text-xs sm:col-span-2 lg:col-span-4"
        >
          <div className={cn(adminReadOnlyValueClass, "py-3")}>
            <AdminVariantStock
              quantityOnHand={variant.quantity_on_hand}
              quantityReserved={variant.quantity_reserved}
              available={variant.available}
            />
          </div>
        </AdminSyncedField>
      </div>
    </div>
  );
}

function CompactMsVariantRow({
  productId,
  productCurrency,
  variant,
  hasColorPhoto,
}: {
  productId: string;
  productCurrency: string;
  variant: VariantRow;
  hasColorPhoto: boolean;
}) {
  const boundAction = updateVariantAction.bind(null, variant.id, productId);
  const [state, formAction, pending] = useActionState<CatalogActionState, FormData>(
    boundAction,
    {},
  );
  const stockBadge = getStockStatusBadge(variant.available ?? (variant.in_stock ? 1 : 0));
  const color = attrValue(variant, "color");
  const size = attrValue(variant, "size");

  return (
    <form action={formAction} className="border-b border-border/60 last:border-b-0">
      <input type="hidden" name="sync_source" value="moysklad" />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)_auto_auto_minmax(7rem,auto)_auto] items-center gap-2 px-2 py-2 text-sm max-lg:grid-cols-2 max-lg:gap-y-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{color}</p>
          <p className="truncate text-xs text-muted-foreground lg:hidden">{variant.sku}</p>
        </div>
        <div className="tabular-nums">{size}</div>
        <div className="hidden truncate text-xs text-muted-foreground lg:block">{variant.sku}</div>
        <AdminStatusBadge label={stockBadge.label} tone={stockBadge.tone} />
        <span
          className={cn(
            "text-xs font-medium",
            hasColorPhoto ? "text-emerald-700" : "text-amber-800",
          )}
          title={hasColorPhoto ? "Есть фото цвета в галерее" : "Нет фото для этого цвета"}
        >
          {hasColorPhoto ? "Фото ✓" : "Фото ✕"}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs">
            <span className="sr-only">Порядок</span>
            <input
              name="sort_order"
              type="number"
              min={0}
              defaultValue={variant.sort_order}
              className={cn(inputClass, "w-16")}
              disabled={pending}
              aria-label="Порядок варианта"
            />
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              name="is_default"
              value="true"
              defaultChecked={variant.is_default}
              disabled={pending}
            />
            по ум.
          </label>
        </div>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending}
          className="justify-self-end"
          aria-label="Сохранить настройки варианта"
        >
          {pending ? "…" : "Сохранить"}
        </Button>
      </div>
      {state.error ? (
        <p className="px-2 pb-2 text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : state.fieldErrors ? (
        <p className="px-2 pb-2 text-xs text-destructive" role="alert">
          {Object.values(state.fieldErrors).join(" ")}
        </p>
      ) : null}
      <details className="px-2 pb-2">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          ERP и остатки · {formatPrice(variant.price_cents, productCurrency)}
        </summary>
        <div className="mt-2">
          <VariantMsSyncedFields variant={variant} currency={productCurrency} />
        </div>
      </details>
    </form>
  );
}

function VariantEditRow({
  productId,
  productCurrency,
  variant,
  msSynced,
}: {
  productId: string;
  productCurrency: string;
  variant: VariantRow;
  msSynced: boolean;
}) {
  const boundAction = updateVariantAction.bind(null, variant.id, productId);
  const [state, formAction, pending] = useActionState<CatalogActionState, FormData>(
    boundAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border p-3">
      <input type="hidden" name="sync_source" value={msSynced ? "moysklad" : "manual"} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {variant.name}
          {variant.is_default ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">(по умолчанию)</span>
          ) : null}
        </p>
        {msSynced ? (
          <span className="text-xs text-muted-foreground">SKU: {variant.sku}</span>
        ) : null}
      </div>

      {msSynced ? (
        <VariantMsSyncedFields variant={variant} currency={productCurrency} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs">
            SKU
            <input name="sku" defaultValue={variant.sku} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            Название
            <input name="name" defaultValue={variant.name} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Розница, ₽
            <input
              name="price_rub"
              type="number"
              min={0}
              step={1}
              defaultValue={centsToRubles(variant.price_cents)}
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Опт, ₽
            <input
              name="wholesale_price_rub"
              type="number"
              min={0}
              step={1}
              defaultValue={
                variant.wholesale_price_cents != null
                  ? centsToRubles(variant.wholesale_price_cents)
                  : ""
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Порядок
            <input
              name="sort_order"
              type="number"
              min={0}
              defaultValue={variant.sort_order}
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2 self-end text-xs">
            <input
              type="checkbox"
              name="is_default"
              value="true"
              defaultChecked={variant.is_default}
            />
            По умолчанию
          </label>
        </div>
      )}

      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : state.fieldErrors ? (
        <p className="text-xs text-destructive" role="alert">
          {Object.values(state.fieldErrors).join(" ")}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Сохранение…" : "Сохранить вариант"}
        </Button>
      </div>
    </form>
  );
}

export function AdminVariantPanel({ product }: AdminVariantPanelProps) {
  const msSynced = isMoySkladSynced(product.sync_source);
  const boundCreate = createVariantAction.bind(null, product.id);
  const [createState, createAction, createPending] = useActionState<
    CatalogActionState,
    FormData
  >(boundCreate, {});
  const coverage = getGalleryColorCoverage(product);
  const taggedColors = new Set(coverage.tagged);

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden rounded-lg border border-border p-4">
      <div>
        <p className="font-medium">Варианты товара</p>
        <p className="text-xs text-muted-foreground">
          {msSynced
            ? "Компактная таблица: цвет, размер, остаток, фото цвета. Цены/SKU из МойСклад — в раскрытии. Здесь: порядок и вариант по умолчанию."
            : "SKU, цены и признак варианта по умолчанию."}
        </p>
      </div>

      {msSynced ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)_auto_auto_minmax(7rem,auto)_auto] gap-2 border-b border-border bg-muted/30 px-2 py-2 text-xs font-medium text-muted-foreground lg:grid">
            <span>Цвет</span>
            <span>Размер</span>
            <span>SKU</span>
            <span>Остаток</span>
            <span>Фото</span>
            <span>Порядок / Def</span>
            <span className="sr-only">Сохранить</span>
          </div>
          {product.variants.map((variant) => {
            const color = variant.attributes?.color?.trim();
            const hasColorPhoto =
              !color ||
              taggedColors.has(color) ||
              (coverage.colors.length < 2 &&
                (Boolean(product.image_url) || product.images.length > 0));
            return (
              <CompactMsVariantRow
                key={variant.id}
                productId={product.id}
                productCurrency={product.currency}
                variant={variant}
                hasColorPhoto={hasColorPhoto}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {product.variants.map((variant) => (
            <VariantEditRow
              key={variant.id}
              productId={product.id}
              productCurrency={product.currency}
              variant={variant}
              msSynced={false}
            />
          ))}
        </div>
      )}

      {!msSynced ? (
        <form action={createAction} className="space-y-3 rounded-md border border-dashed border-border p-3">
          <p className="text-sm font-medium">Добавить вариант</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs">
              SKU
              <input name="sku" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs sm:col-span-2">
              Название
              <input name="name" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Розница, ₽
              <input name="price_rub" type="number" min={0} step={1} required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Опт, ₽
              <input name="wholesale_price_rub" type="number" min={0} step={1} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Порядок
              <input name="sort_order" type="number" min={0} defaultValue={0} className={inputClass} />
            </label>
            <label className="flex items-center gap-2 self-end text-xs">
              <input type="checkbox" name="is_default" value="true" />
              По умолчанию
            </label>
          </div>
          {createState.error ? (
            <p className="text-xs text-destructive" role="alert">
              {createState.error}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={createPending}>
            {createPending ? "Добавление…" : "Добавить вариант"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
