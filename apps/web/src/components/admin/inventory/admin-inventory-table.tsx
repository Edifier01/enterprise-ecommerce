"use client";

import Link from "next/link";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import {
  AdminMobileCard,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import { InventoryProductGroup } from "@/components/admin/inventory/inventory-product-group";
import { MoySkladBadge } from "@/components/admin/moysklad/moysklad-badge";
import { Badge } from "@/components/ui/badge";
import type {
  AdminInventoryItem,
  AdminInventoryProductGroup,
} from "@/lib/admin/inventory-shared";
import {
  buildAdminInventoryProductEditHref,
  type AdminInventoryListParams,
} from "@/lib/admin/inventory-list-url";
import { isMoySkladSynced } from "@/lib/admin/moysklad";

type AdminInventoryTableProps = {
  items: AdminInventoryItem[];
  groups: AdminInventoryProductGroup[];
  groupBy: "variant" | "product";
  lowStockThreshold: number;
  listParams: AdminInventoryListParams;
};

const variantColumns = (
  listParams: AdminInventoryListParams,
): AdminDataTableColumn<AdminInventoryItem>[] => [
  {
    id: "sku",
    header: "SKU / товар",
    sortValue: (item) => item.sku,
    cell: (item) => (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.sku}</span>
          {isMoySkladSynced(item.sync_source) ? <MoySkladBadge /> : null}
        </div>
        <div className="text-xs text-muted-foreground">{item.product_name}</div>
      </div>
    ),
  },
  {
    id: "on_hand",
    header: "На складе",
    sortValue: (item) => item.quantity_on_hand,
    cellClassName: "text-right",
    headerClassName: "text-right",
    cell: (item) => item.quantity_on_hand,
  },
  {
    id: "reserved",
    header: "Резерв",
    sortValue: (item) => item.quantity_reserved,
    cellClassName: "text-right",
    headerClassName: "text-right",
    cell: (item) => item.quantity_reserved,
  },
  {
    id: "available",
    header: "Доступно",
    sortValue: (item) => item.available,
    cellClassName: "text-right",
    headerClassName: "text-right",
    cell: (item) => (
      <div className="flex items-center justify-end gap-2">
        <span>{item.available}</span>
        {item.is_low_stock ? <Badge variant="destructive">Низкий</Badge> : null}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Действия",
    cell: (item) => (
      <Link
        href={buildAdminInventoryProductEditHref(item.product_id, listParams)}
        className="text-primary hover:underline"
      >
        Товар
      </Link>
    ),
  },
];

export function AdminInventoryTable({
  items,
  groups,
  groupBy,
  lowStockThreshold,
  listParams,
}: AdminInventoryTableProps) {
  const intro = (
    <>
      <p className="text-sm text-muted-foreground">
        Остатки обновляются из МойСклад. Ручная корректировка на сайте отключена — изменяйте
        количество в{" "}
        <Link href="/admin/integrations/moysklad" className="text-primary hover:underline">
          интеграции МойСклад
        </Link>{" "}
        или запустите «Обновить остатки».
      </p>
      <p className="text-sm text-muted-foreground">
        Порог низкого остатка: {lowStockThreshold} шт. (доступно = на складе − резерв).
      </p>
    </>
  );

  if (groupBy === "product") {
    if (groups.length === 0) {
      return (
        <div className="space-y-3">
          {intro}
          <AdminEmptyState
            title="Нет товаров на складе"
            description="Импортируйте товары из МойСклад или проверьте синхронизацию остатков."
            action={{ label: "Интеграция МойСклад", href: "/admin/integrations/moysklad" }}
          />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {intro}
        <div className="space-y-3">
          {groups.map((group) => (
            <InventoryProductGroup
              key={group.product_id}
              group={group}
              listParams={listParams}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {intro}
      <AdminDataTable
        tableId="admin-inventory-variants"
        columns={variantColumns(listParams)}
        rows={items}
        getRowId={(item) => item.variant_id}
        stickyHeader
        density="compact"
        emptyState={
          <AdminEmptyState
            title="Нет записей склада"
            description="Импортируйте товары из МойСклад или проверьте синхронизацию остатков."
            action={{ label: "Интеграция МойСклад", href: "/admin/integrations/moysklad" }}
          />
        }
        renderMobileCard={(item) => (
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
              <Link
                href={buildAdminInventoryProductEditHref(item.product_id, listParams)}
                className="text-sm text-primary hover:underline"
              >
                Открыть товар
              </Link>
            </div>
          </AdminMobileCard>
        )}
      />
    </div>
  );
}
