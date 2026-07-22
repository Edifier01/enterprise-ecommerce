export type AdminInventoryItem = {
  variant_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  sync_source: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  available: number;
  version: number;
  is_low_stock: boolean;
};

export type AdminInventoryProductGroup = {
  product_id: string;
  product_name: string;
  sync_source: string;
  total_on_hand: number;
  total_reserved: number;
  total_available: number;
  is_low_stock: boolean;
  variant_count: number;
  variants: AdminInventoryItem[];
};

export type AdminInventoryList = {
  items: AdminInventoryItem[];
  groups: AdminInventoryProductGroup[];
  group_by: "variant" | "product";
  total: number;
  page: number;
  limit: number;
  low_stock_threshold: number;
};

export type AdminInventoryOverview = {
  total_variants: number;
  total_products: number;
  low_stock_variants: number;
  low_stock_products: number;
  out_of_stock_variants: number;
  out_of_stock_products: number;
  low_stock_threshold: number;
};

export const INVENTORY_REASONS = [
  { value: "restock", label: "Пополнение" },
  { value: "damage", label: "Брак / списание" },
  { value: "correction", label: "Корректировка" },
  { value: "return", label: "Возврат на склад" },
] as const;
