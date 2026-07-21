"use client";

type AdminCustomersSearchProps = {
  defaultQuery?: string;
};

export function AdminCustomersSearch({ defaultQuery = "" }: AdminCustomersSearchProps) {
  return (
    <form method="get" action="/admin/customers" className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Поиск по email…"
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
