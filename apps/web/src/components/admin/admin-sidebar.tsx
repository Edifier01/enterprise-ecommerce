import Link from "next/link";

import { adminLogoutAction } from "@/app/actions/admin-auth";
import type { AdminUser } from "@/lib/admin/types";

const NAV_ITEMS = [
  { href: "/admin", label: "Сводка", enabled: true },
  { href: "/admin/catalog", label: "Каталог", enabled: true },
  { href: "/admin/inventory", label: "Склад", enabled: true },
  { href: "/admin/orders", label: "Заказы", enabled: true },
  { href: "/admin/customers", label: "Клиенты", enabled: true },
] as const;

type AdminSidebarProps = {
  admin: AdminUser;
};

export function AdminSidebar({ admin }: AdminSidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="border-b border-border px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Админ-панель
        </p>
        <p className="mt-1 truncate text-sm font-medium">{admin.email}</p>
        <p className="text-xs text-muted-foreground">{admin.role}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) =>
          item.enabled ? (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground"
              title="Скоро"
            >
              {item.label}
              <span className="ml-2 text-xs">(скоро)</span>
            </span>
          ),
        )}
      </nav>

      <form action={adminLogoutAction} className="border-t border-border p-3">
        <button
          type="submit"
          className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Выйти
        </button>
      </form>
    </aside>
  );
}
