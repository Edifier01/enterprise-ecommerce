"use client";

import { useActionState } from "react";

import {
  adjustInventoryAction,
  type InventoryActionState,
} from "@/app/actions/admin-inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdminInventoryItem } from "@/lib/admin/inventory-shared";
import { INVENTORY_REASONS } from "@/lib/admin/inventory-shared";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type InventoryAdjustRowProps = {
  item: AdminInventoryItem;
};

function InventoryAdjustRow({ item }: InventoryAdjustRowProps) {
  const boundAction = adjustInventoryAction.bind(null, item.variant_id);
  const [state, formAction, pending] = useActionState<InventoryActionState, FormData>(
    boundAction,
    {},
  );

  return (
    <tr className="border-b border-border/60 align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{item.sku}</div>
        <div className="text-xs text-muted-foreground">{item.product_name}</div>
      </td>
      <td className="px-4 py-3">{item.quantity_on_hand}</td>
      <td className="px-4 py-3">{item.quantity_reserved}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span>{item.available}</span>
          {item.is_low_stock && <Badge variant="destructive">Низкий</Badge>}
        </div>
      </td>
      <td className="px-4 py-3">
        <form action={formAction} className="flex min-w-[280px] flex-col gap-2">
          <input type="hidden" name="version" value={item.version} />
          <input
            name="quantity_on_hand"
            type="number"
            min={item.quantity_reserved}
            defaultValue={item.quantity_on_hand}
            className={inputClass}
            aria-label={`Новое количество для ${item.sku}`}
          />
          <select name="reason" defaultValue="restock" className={inputClass}>
            {INVENTORY_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
          {state.error && (
            <p className="text-xs text-destructive" role="alert">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="text-xs text-green-600" role="status">
              Сохранено
            </p>
          )}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Сохранение..." : "Обновить"}
          </Button>
        </form>
      </td>
    </tr>
  );
}

type AdminInventoryTableProps = {
  items: AdminInventoryItem[];
  lowStockThreshold: number;
};

export function AdminInventoryTable({ items, lowStockThreshold }: AdminInventoryTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Нет записей склада. Запустите seed или создайте товары с вариантами.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Порог низкого остатка: {lowStockThreshold} шт. (доступно = на складе − резерв).
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3">SKU / товар</th>
              <th className="px-4 py-3">На складе</th>
              <th className="px-4 py-3">Резерв</th>
              <th className="px-4 py-3">Доступно</th>
              <th className="px-4 py-3">Корректировка</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <InventoryAdjustRow key={item.variant_id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
