"use client";

type AdminCatalogSearchProps = {
  defaultQuery?: string;
  status?: string;
};

export function AdminCatalogSearch({ defaultQuery = "", status }: AdminCatalogSearchProps) {
  return (
    <form method="get" action="/admin/catalog" className="flex flex-wrap items-center gap-2">
      {status ? <input type="hidden" name="status" value={status} /> : null}
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Поиск по названию, slug или SKU…"
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
