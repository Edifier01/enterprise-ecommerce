export type AdminInventoryItem = {
  variant_id: string;
  sku: string;
  product_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  available: number;
  version: number;
  is_low_stock: boolean;
};

export type AdminInventoryList = {
  items: AdminInventoryItem[];
  total: number;
  page: number;
  limit: number;
  low_stock_threshold: number;
};

export const INVENTORY_REASONS = [
  { value: "restock", label: "Пополнение" },
  { value: "damage", label: "Брак / списание" },
  { value: "correction", label: "Корректировка" },
  { value: "return", label: "Возврат на склад" },
] as const;
