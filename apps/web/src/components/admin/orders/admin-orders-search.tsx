"use client";

type AdminOrdersSearchProps = {
  defaultQuery?: string;
  status?: string;
  exportPending?: boolean;
};

export function AdminOrdersSearch({
  defaultQuery = "",
  status,
  exportPending,
}: AdminOrdersSearchProps) {
  return (
    <form method="get" action="/admin/orders" className="flex flex-wrap items-center gap-2">
      {exportPending ? <input type="hidden" name="export_pending" value="1" /> : null}
      {!exportPending && status ? <input type="hidden" name="status" value={status} /> : null}
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Поиск по номеру заказа или email…"
        className="h-9 min-w-[16rem] flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
      >
        Найти
      </button>
    </form>
  );
}
