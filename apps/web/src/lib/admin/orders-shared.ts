export type AdminOrderSummary = {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  total_cents: number;
  customer_email: string | null;
  moysklad_order_id: string | null;
  created_at: string;
};

export type AdminOrderLine = {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  product_snapshot: {
    product_name: string;
    product_slug: string;
    name: string;
    sku: string;
    currency: string;
  };
};

export type AdminOrderStatusHistory = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  reason: string | null;
  changed_at: string;
};

export type AdminOrderDetail = AdminOrderSummary & {
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  updated_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  is_wholesaler: boolean;
  lines: AdminOrderLine[];
  status_history: AdminOrderStatusHistory[];
};

export type AdminOrderList = {
  items: AdminOrderSummary[];
  total: number;
  page: number;
  limit: number;
};

export function getAdminOrderStatusLabel(status: string): string {
  switch (status) {
    case "confirmed":
      return "Подтверждён";
    case "shipped":
      return "Отправлен";
    case "canceled":
      return "Отменён";
    default:
      return status;
  }
}

export function formatOrderMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
