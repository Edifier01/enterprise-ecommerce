"use client";

import { useActionState } from "react";

import {
  createVariantAction,
  updateVariantAction,
  type CatalogActionState,
} from "@/app/actions/admin-catalog";
import { Button } from "@/components/ui/button";
import type { AdminProduct } from "@/lib/admin/catalog";
import { centsToRubles } from "@/lib/admin/money";

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminVariantPanelProps = {
  product: AdminProduct;
};

function VariantEditRow({
  productId,
  variant,
}: {
  productId: string;
  variant: AdminProduct["variants"][number];
}) {
  const boundAction = updateVariantAction.bind(null, variant.id, productId);
  const [state, formAction, pending] = useActionState<CatalogActionState, FormData>(
    boundAction,
    {},
  );

  return (
    <form action={formAction} className="grid gap-2 rounded-md border border-border/60 p-3">
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
          Цена, ₽
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
  const boundCreate = createVariantAction.bind(null, product.id);
  const [createState, createAction, createPending] = useActionState<
    CatalogActionState,
    FormData
  >(boundCreate, {});

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <p className="font-medium">Варианты товара</p>
        <p className="text-xs text-muted-foreground">
          SKU, цены и признак варианта по умолчанию.
        </p>
      </div>

      <div className="space-y-3">
        {product.variants.map((variant) => (
          <VariantEditRow key={variant.id} productId={product.id} variant={variant} />
        ))}
      </div>

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
            Цена, ₽
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
    </div>
  );
}
