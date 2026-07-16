"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Сводка", exact: true },
  { href: "/admin/catalog", label: "Каталог", exact: false },
  { href: "/admin/inventory", label: "Склад", exact: false },
  { href: "/admin/orders", label: "Заказы", exact: false },
  { href: "/admin/customers", label: "Клиенты", exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, item.exact);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground"
                : "rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
