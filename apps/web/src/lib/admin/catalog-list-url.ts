export type AdminCatalogListParams = {
  page?: number;
  status?: string;
  q?: string;
  categoryId?: string;
  uncategorized?: boolean;
  showAll?: boolean;
  needsStyling?: boolean;
  needsColorPhotos?: boolean;
};

export function buildAdminCatalogListHref(params: AdminCatalogListParams = {}): string {
  const search = new URLSearchParams();

  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  if (params.status) {
    search.set("status", params.status);
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (params.uncategorized) {
    search.set("uncategorized", "1");
  } else if (params.categoryId) {
    search.set("category_id", params.categoryId);
  } else if (params.showAll || params.needsStyling || params.needsColorPhotos) {
    search.set("all", "1");
  }

  if (params.needsStyling) {
    search.set("needs_styling", "1");
  }
  if (params.needsColorPhotos) {
    search.set("needs_color_photos", "1");
  }

  const query = search.toString();
  return query ? `/admin/catalog?${query}` : "/admin/catalog";
}

export function buildAdminCatalogEditHref(
  productId: string,
  listParams: AdminCatalogListParams,
): string {
  const from = buildAdminCatalogListHref(listParams);
  return `/admin/catalog/${productId}/edit?from=${encodeURIComponent(from)}`;
}

export function parseAdminReturnPath(from: string | undefined, fallback = "/admin/catalog"): string {
  if (!from || !from.startsWith("/admin/") || from.includes("//")) {
    return fallback;
  }
  return from;
}

export function getAdminReturnLabel(href: string): string {
  try {
    const url = new URL(href, "http://local");
    const params = url.searchParams;

    if (url.pathname.startsWith("/admin/integrations/moysklad/import")) {
      return "← К очереди импорта";
    }
    if (url.pathname === "/admin/inventory") {
      if (params.get("group_by") === "product") {
        return "← По товарам";
      }
      if (params.get("low_stock") === "true") {
        return "← Низкий остаток";
      }
      if (params.get("q")) {
        return "← К результатам поиска";
      }
      return "← К складу";
    }
    if (params.get("needs_styling") === "1") {
      return "← Требует оформления";
    }
    if (params.get("needs_color_photos") === "1") {
      return "← Фото по цветам";
    }
    if (params.get("uncategorized") === "1") {
      return "← Без категории";
    }
    if (params.get("all") === "1") {
      return "← Все товары";
    }
    if (params.get("category_id")) {
      return "← К категории";
    }
    if (params.get("q")) {
      return "← К результатам поиска";
    }
    if (url.pathname === "/admin/catalog" && params.get("view") === "categories") {
      return "← К категориям";
    }
    if (url.pathname === "/admin/catalog" && !url.search) {
      return "← К категориям";
    }
  } catch {
    // fall through
  }

  return "← К каталогу";
}

export function getProductCategoryName(
  categoryId: string | null,
  categoryNames: Map<string, string> | null,
): string {
  if (!categoryId) {
    return "—";
  }
  return categoryNames?.get(categoryId) ?? "—";
}

export function buildCategoryNameMap(
  categories: Array<{ id: string; name: string }> | null,
): Map<string, string> | null {
  if (!categories) {
    return null;
  }
  return new Map(categories.map((category) => [category.id, category.name]));
}
