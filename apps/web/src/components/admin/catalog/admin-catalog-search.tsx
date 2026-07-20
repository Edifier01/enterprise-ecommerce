"use client";

type AdminCatalogSearchProps = {
  defaultQuery?: string;
  status?: string;
  categoryId?: string;
  uncategorized?: boolean;
  showAll?: boolean;
  needsStyling?: boolean;
  needsColorPhotos?: boolean;
};

export function AdminCatalogSearch({
  defaultQuery = "",
  status,
  categoryId,
  uncategorized,
  showAll,
  needsStyling,
  needsColorPhotos,
}: AdminCatalogSearchProps) {
  return (
    <form method="get" action="/admin/catalog" className="flex flex-wrap items-center gap-2">
      {status ? <input type="hidden" name="status" value={status} /> : null}
      {uncategorized ? <input type="hidden" name="uncategorized" value="1" /> : null}
      {showAll ? <input type="hidden" name="all" value="1" /> : null}
      {needsStyling ? <input type="hidden" name="needs_styling" value="1" /> : null}
      {needsColorPhotos ? <input type="hidden" name="needs_color_photos" value="1" /> : null}
      {categoryId ? <input type="hidden" name="category_id" value={categoryId} /> : null}
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
