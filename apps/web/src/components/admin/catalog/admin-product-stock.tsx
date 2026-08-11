import { AdminStockAvailabilityBadge } from "@/components/admin/admin-status-badge";
import {
  formatAdminProductStockLabel,
  getAdminProductStockAvailable,
  type AdminProduct,
} from "@/lib/admin/catalog-shared";

type AdminProductStockProps = {
  product: AdminProduct;
  showAvailabilityBadge?: boolean;
};

export function AdminProductStock({
  product,
  showAvailabilityBadge = true,
}: AdminProductStockProps) {
  const available = getAdminProductStockAvailable(product);
  const showBadge =
    showAvailabilityBadge && (product.is_low_stock || available <= 0);

  return (
    <span className="inline-flex items-center gap-2">
      <span>{formatAdminProductStockLabel(product)}</span>
      {showBadge ? (
        <AdminStockAvailabilityBadge available={available} className="text-xs" />
      ) : null}
    </span>
  );
}

type AdminVariantStockProps = {
  quantityOnHand?: number | null;
  quantityReserved?: number | null;
  available?: number | null;
};

export function AdminVariantStock({
  quantityOnHand,
  quantityReserved,
  available,
}: AdminVariantStockProps) {
  if (
    quantityOnHand == null &&
    quantityReserved == null &&
    available == null
  ) {
    return <p>Остаток не синхронизирован</p>;
  }

  const availableQty = available ?? 0;

  return (
    <div className="space-y-2">
      <div className="grid gap-1 sm:grid-cols-3">
        <p>На складе (МС): {quantityOnHand ?? 0} шт.</p>
        <p>Резерв: {quantityReserved ?? 0} шт.</p>
        <p>Доступно: {availableQty} шт.</p>
      </div>
      {availableQty <= 0 ? (
        <AdminStockAvailabilityBadge available={availableQty} className="text-xs" />
      ) : null}
    </div>
  );
}
