import {
  formatPrice,
  getAdminProductListPrices,
  type AdminProduct,
} from "@/lib/admin/catalog-shared";

type AdminProductPricesProps = {
  product: AdminProduct;
  compact?: boolean;
};

export function AdminProductPrices({ product, compact = false }: AdminProductPricesProps) {
  const { retailCents, wholesaleCents } = getAdminProductListPrices(product);

  if (compact) {
    return (
      <div className="flex flex-col gap-0.5 text-sm">
        <span>{formatPrice(retailCents, product.currency)}</span>
        <span className="text-muted-foreground">
          {wholesaleCents != null ? formatPrice(wholesaleCents, product.currency) : "—"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <span>Розница: {formatPrice(retailCents, product.currency)}</span>
      <span className="text-muted-foreground">
        Опт: {wholesaleCents != null ? formatPrice(wholesaleCents, product.currency) : "—"}
      </span>
    </div>
  );
}
