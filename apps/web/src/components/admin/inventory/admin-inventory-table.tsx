import Link from "next/link";

import {
  AdminDesktopTable,
  AdminMobileCard,
  AdminMobileCardList,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import { MoySkladBadge } from "@/components/admin/moysklad/moysklad-badge";
import { Badge } from "@/components/ui/badge";
import type { AdminInventoryItem } from "@/lib/admin/inventory-shared";
import { isMoySkladSynced } from "@/lib/admin/moysklad";

type AdminInventoryTableProps = {
  items: AdminInventoryItem[];
  lowStockThreshold: number;
};

export function AdminInventoryTable({ items, lowStockThreshold }: AdminInventoryTableProps) {
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
              </tr>
            ))}
          </tbody>
        </table>
      </AdminDesktopTable>
    </div>
  );
}
