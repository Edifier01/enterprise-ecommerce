"use client";

import { useActionState } from "react";

import {
  adjustInventoryAction,
  type InventoryActionState,
} from "@/app/actions/admin-inventory";
import {
  AdminDesktopTable,
  AdminMobileCard,
  AdminMobileCardList,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import { MoySkladBadge } from "@/components/admin/moysklad/moysklad-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdminInventoryItem } from "@/lib/admin/inventory-shared";
import { INVENTORY_REASONS } from "@/lib/admin/inventory-shared";
import { adminInputClassLg, adminSelectClass } from "@/lib/admin/form-styles";
import { isMoySkladSynced } from "@/lib/admin/moysklad";

const inputClass = adminInputClassLg;
const selectClass = adminSelectClass;

function InventoryAdjustForm({ item }: { item: AdminInventoryItem }) {
  const boundAction = adjustInventoryAction.bind(null, item.variant_id);
  const [state, formAction, pending] = useActionState<InventoryActionState, FormData>(
    boundAction,
    {},
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-2">
      <input type="hidden" name="version" value={item.version} />
      <input
        name="quantity_on_hand"
        type="number"
        min={item.quantity_reserved}
        defaultValue={item.quantity_on_hand}
        className={inputClass}
        aria-label={`Новое количество для ${item.sku}`}
      />
      <select name="reason" defaultValue="restock" className={selectClass}>
        {INVENTORY_REASONS.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </select>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-xs text-green-600" role="status">
          Сохранено
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending} className="w-full md:w-auto">
        {pending ? "Сохранение..." : "Обновить"}
      </Button>
    </form>
  );
}

function InventoryAdjustCell({
  item,
  canWrite,
}: {
  item: AdminInventoryItem;
  canWrite: boolean;
}) {
  const msSynced = isMoySkladSynced(item.sync_source);

  if (msSynced) {
    return (
      <div className="space-y-1 text-sm text-muted-foreground">
        <MoySkladBadge />
        <p className="text-xs">Остаток синхронизируется из МойСклад.</p>
      </div>
    );
  }

  if (!canWrite) {
    return <p className="text-sm text-muted-foreground">Только просмотр</p>;
  }

  return <InventoryAdjustForm item={item} />;
}

type AdminInventoryTableProps = {
  items: AdminInventoryItem[];
  lowStockThreshold: number;
  canWrite?: boolean;
};

export function AdminInventoryTable({
  items,
  lowStockThreshold,
  canWrite = false,
}: AdminInventoryTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Нет записей склада. Импортируйте товары из МойСклад или проверьте синхронизацию остатков.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Остатки товаров из МойСклад обновляются автоматически при синхронизации. Ручная корректировка
        доступна только для несинхронизированных позиций — для MS-товаров изменения вносятся в
        МойСклад.
      </p>
      <p className="text-sm text-muted-foreground">
        Порог низкого остатка: {lowStockThreshold} шт. (доступно = на складе − резерв).
      </p>

      <AdminMobileCardList>
        {items.map((item) => (
          <AdminMobileCard key={item.variant_id}>
            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.sku}</p>
                  {isMoySkladSynced(item.sync_source) ? <MoySkladBadge /> : null}
                </div>
                <p className="text-xs text-muted-foreground">{item.product_name}</p>
              </div>
              <AdminMobileCardRow label="На складе">{item.quantity_on_hand}</AdminMobileCardRow>
              <AdminMobileCardRow label="Резерв">{item.quantity_reserved}</AdminMobileCardRow>
              <AdminMobileCardRow label="Доступно">
                <span className="inline-flex items-center gap-2">
                  {item.available}
                  {item.is_low_stock ? <Badge variant="destructive">Низкий</Badge> : null}
                </span>
              </AdminMobileCardRow>
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Корректировка
                </p>
                <InventoryAdjustCell item={item} canWrite={canWrite} />
              </div>
            </div>
          </AdminMobileCard>
        ))}
      </AdminMobileCardList>

      <AdminDesktopTable className="rounded-xl">
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
              <tr key={item.variant_id} className="border-b border-border/60 align-top">
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.sku}</span>
                    {isMoySkladSynced(item.sync_source) ? <MoySkladBadge /> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.product_name}</div>
                </td>
                <td className="px-4 py-3">{item.quantity_on_hand}</td>
                <td className="px-4 py-3">{item.quantity_reserved}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{item.available}</span>
                    {item.is_low_stock ? <Badge variant="destructive">Низкий</Badge> : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-[280px]">
                    <InventoryAdjustCell item={item} canWrite={canWrite} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminDesktopTable>
    </div>
  );
}
