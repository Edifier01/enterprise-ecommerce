export type AdminUser = {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  created_at: string;
};

export type DashboardSummary = {
  orders_today: number;
  orders_last_7_days: number;
  revenue_last_7_days_cents: number;
  low_stock_count: number;
  orders_by_status: Record<string, number>;
};
