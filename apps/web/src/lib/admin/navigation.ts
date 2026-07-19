export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Сводка", exact: true },
  { href: "/admin/integrations/moysklad", label: "МойСклад", exact: false },
  { href: "/admin/integrations/moysklad/import", label: "Очередь импорта", exact: false },
  { href: "/admin/catalog", label: "Каталог", exact: false },
  { href: "/admin/inventory", label: "Склад", exact: false },
  { href: "/admin/orders", label: "Заказы", exact: false },
  { href: "/admin/customers", label: "Клиенты", exact: false },
] as const;

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
