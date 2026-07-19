import { MoySkladBadge } from "@/components/admin/moysklad/moysklad-badge";
import type { AdminProduct } from "@/lib/admin/catalog-shared";
import { isMoySkladSynced, moyskladProductUrl } from "@/lib/admin/moysklad";

type MoySkladProductBannerProps = {
  product: AdminProduct;
};

function formatSyncedAt(value: string | null): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function MoySkladProductBanner({ product }: MoySkladProductBannerProps) {
  if (!isMoySkladSynced(product.sync_source)) return null;

  const syncedAt = formatSyncedAt(product.last_synced_at);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <MoySkladBadge />
            {syncedAt ? (
              <span className="text-xs text-muted-foreground">
                Синхронизировано: {syncedAt}
              </span>
            ) : null}
          </div>
          {product.erp_name && product.erp_name !== product.name ? (
            <p className="text-sm text-muted-foreground">
              Название в МойСклад: <span className="font-medium">{product.erp_name}</span>
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Цены, SKU, остатки и модификации редактируются только в МойСклад.
          </p>
        </div>
        {product.moysklad_product_id ? (
          <a
            href={moyskladProductUrl(product.moysklad_product_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
          >
            Открыть в МойСклад ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
