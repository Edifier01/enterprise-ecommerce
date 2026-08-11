import { cn } from "@/lib/utils";

export type StoreStockState = "in_stock" | "out_of_stock" | "low_stock" | "sale";

const STATE_CLASS: Record<StoreStockState, string> = {
  in_stock: "bg-store-success text-store-success-foreground",
  out_of_stock: "bg-store-muted-badge text-store-muted-badge-foreground",
  low_stock: "bg-amber-100 text-amber-900",
  sale: "bg-store-sale text-store-sale-foreground",
};

const STATE_LABEL: Record<StoreStockState, string> = {
  in_stock: "В наличии",
  out_of_stock: "Нет в наличии",
  low_stock: "Мало",
  sale: "Скидка",
};

type StoreStatusBadgeProps = {
  state: StoreStockState;
  label?: string;
  className?: string;
};

export function StoreStatusBadge({ state, label, className }: StoreStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATE_CLASS[state],
        className,
      )}
    >
      {label ?? STATE_LABEL[state]}
    </span>
  );
}

export function getStoreStockState(inStock: boolean, lowStock = false): StoreStockState {
  if (!inStock) {
    return "out_of_stock";
  }
  if (lowStock) {
    return "low_stock";
  }
  return "in_stock";
}
