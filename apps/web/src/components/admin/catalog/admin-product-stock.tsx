import { Badge } from "@/components/ui/badge";
import {
  formatAdminProductStockLabel,
  getAdminProductStockAvailable,
  type AdminProduct,
} from "@/lib/admin/catalog-shared";

type AdminProductStockProps = {
  product: AdminProduct;
  showLowStockBadge?: boolean;
};

export function AdminProductStock({
  product,
  showLowStockBadge = true,
}: AdminProductStockProps) {
  const available = getAdminProductStockAvailable(product);

  return (
    <span className="inline-flex items-center gap-2">
      <span>{formatAdminProductStockLabel(product)}</span>
      {showLowStockBadge && product.is_low_stock ? (
        <Badge variant="destructive">Низкий</Badge>
      ) : null}
      {!product.is_low_stock && available === 0 ? (
        <Badge variant="secondary">Нет</Badge>
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

  return (
    <div className="grid gap-1 sm:grid-cols-3">
      <p>На складе (МС): {quantityOnHand ?? 0} шт.</p>
      <p>Резерв: {quantityReserved ?? 0} шт.</p>
      <p>Доступно: {available ?? 0} шт.</p>
    </div>
  );
}
