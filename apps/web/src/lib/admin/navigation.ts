export type AdminNavLink = {
  href: string;
  label: string;
  exact: boolean;
  /** At least one permission required; defaults to admin:read. */
  permissions?: readonly string[];
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
      { href: "/admin/catalog?all=1", label: "Товары", exact: false },
      {
        href: "/admin/catalog/workflow",
        label: "Оформление",
        exact: false,
      },
      {
        href: "/admin/catalog/categories",
        label: "Категории",
        exact: false,
        permissions: ["catalog:write"],
      },
    ],
  },
  {
    title: "МойСклад",
    items: [
      { href: "/admin/integrations/moysklad", label: "Интеграция", exact: false },
      {
        href: "/admin/integrations/moysklad/import",
        label: "Очередь импорта",
        exact: false,
        permissions: ["catalog:write"],
      },
    ],
  },
  {
    title: "Операции",
    items: [
      { href: "/admin/inventory", label: "Склад", exact: false },
      { href: "/admin/orders", label: "Заказы", exact: false },
      {
        href: "/admin/customers",
        label: "Клиенты",
        exact: false,
        permissions: ["customers:read"],
      },
    ],
  },
] as const;

/** Flat list for backward compatibility (active-route helpers, tests). */
export const ADMIN_NAV_ITEMS: readonly AdminNavLink[] = ADMIN_NAV_SECTIONS.flatMap(
  (section) => section.items,
);

function navLinkAllowed(link: AdminNavLink, permissions: readonly string[]): boolean {
  const required = link.permissions ?? ["admin:read"];
  return required.some((permission) => permissions.includes(permission));
}

/** Sidebar sections visible for the current admin role. */
export function filterAdminNavSections(
  permissions: readonly string[],
): AdminNavSection[] {
  return ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => navLinkAllowed(item, permissions)),
  })).filter((section) => section.items.length > 0);
}

export function isAdminNavActive(
  pathname: string,
  href: string,
  exact: boolean,
): boolean {
  if (exact) {
    return pathname === href;
  }
  if (href.startsWith("/admin/catalog?")) {
    if (pathname === "/admin/catalog/categories") {
      return false;
    }
    return pathname === "/admin/catalog" || pathname.startsWith("/admin/catalog/");
  }
  if (href === "/admin/catalog/categories") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
