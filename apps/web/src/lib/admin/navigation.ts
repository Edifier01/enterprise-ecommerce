export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Сводка", exact: true },
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
