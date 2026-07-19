export type AdminNavLink = {
  href: string;
  label: string;
  exact: boolean;
};

export type AdminNavSection = {
  title: string | null;
  items: readonly AdminNavLink[];
};

/** Grouped sidebar IA per ADR-012. */
export const ADMIN_NAV_SECTIONS: readonly AdminNavSection[] = [
  {
    title: null,
    items: [{ href: "/admin", label: "Сводка", exact: true }],
  },
  {
    title: "Витрина",
    items: [
      { href: "/admin/catalog", label: "Товары", exact: false },
      { href: "/admin/catalog/categories", label: "Категории", exact: false },
    ],
  },
  {
    title: "МойСклад",
    items: [
      { href: "/admin/integrations/moysklad", label: "Интеграция", exact: false },
      { href: "/admin/integrations/moysklad/import", label: "Очередь импорта", exact: false },
    ],
  },
  {
    title: "Операции",
    items: [
      { href: "/admin/inventory", label: "Склад", exact: false },
      { href: "/admin/orders", label: "Заказы", exact: false },
      { href: "/admin/customers", label: "Клиенты", exact: false },
    ],
  },
] as const;

/** Flat list for backward compatibility (active-route helpers, tests). */
export const ADMIN_NAV_ITEMS: readonly AdminNavLink[] = ADMIN_NAV_SECTIONS.flatMap(
  (section) => section.items,
);

export function isAdminNavActive(
  pathname: string,
  href: string,
  exact: boolean,
): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
