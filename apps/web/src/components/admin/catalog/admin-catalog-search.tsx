"use client";

import { AdminSearchBar } from "@/components/admin/admin-search-bar";

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
    <AdminSearchBar
      action="/admin/catalog"
      label="Поиск по каталогу"
      placeholder="Название, slug или SKU…"
      defaultQuery={defaultQuery}
      hidden={{
        status,
        category_id: categoryId,
        uncategorized: uncategorized ? "1" : undefined,
        all: showAll ? "1" : undefined,
        needs_styling: needsStyling ? "1" : undefined,
        needs_color_photos: needsColorPhotos ? "1" : undefined,
      }}
    />
  );
}
