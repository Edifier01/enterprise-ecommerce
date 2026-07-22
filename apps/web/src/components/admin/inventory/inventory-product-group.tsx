"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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
import { cn } from "@/lib/utils";

type InventoryProductGroupProps = {
  group: AdminInventoryProductGroup;
  listParams: AdminInventoryListParams;
  defaultOpen?: boolean;
};

function VariantRow({
  item,
  listParams,
}: {
  item: AdminInventoryItem;
  listParams: AdminInventoryListParams;
}) {
  return (
    <div className="grid gap-2 border-t border-border/60 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.sku}</span>
          {isMoySkladSynced(item.sync_source) ? <MoySkladBadge /> : null}
        </div>
      </div>
      <div className="text-muted-foreground sm:text-right">{item.quantity_on_hand}</div>
      <div className="text-muted-foreground sm:text-right">{item.quantity_reserved}</div>
      <div className="sm:text-right">
        <span className="inline-flex items-center gap-2">
          {item.available}
          {item.is_low_stock ? <Badge variant="destructive">Низкий</Badge> : null}
        </span>
      </div>
      <div className="sm:text-right">
        <Link
          href={buildAdminInventoryProductEditHref(item.product_id, listParams)}
          className="text-primary hover:underline"
        >
          Товар
        </Link>
      </div>
    </div>
  );
}

export function InventoryProductGroup({
  group,
  listParams,
  defaultOpen = false,
}: InventoryProductGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{group.product_name}</span>
            {isMoySkladSynced(group.sync_source) ? <MoySkladBadge /> : null}
            {group.is_low_stock ? <Badge variant="destructive">Низкий остаток</Badge> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {group.variant_count} вариант(ов) · доступно {group.total_available} · на складе{" "}
            {group.total_on_hand} · резерв {group.total_reserved}
          </p>
        </div>
        <Link
          href={buildAdminInventoryProductEditHref(group.product_id, listParams)}
          className="shrink-0 text-sm text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          Открыть
        </Link>
      </button>

      <div className={cn(!open && "hidden")}>
        <div className="hidden border-t border-border/60 bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))_auto]">
          <span>SKU</span>
          <span className="text-right">На складе</span>
          <span className="text-right">Резерв</span>
          <span className="text-right">Доступно</span>
          <span className="text-right">Действия</span>
        </div>
        {group.variants.map((variant) => (
          <VariantRow key={variant.variant_id} item={variant} listParams={listParams} />
        ))}
      </div>
    </div>
  );
}
