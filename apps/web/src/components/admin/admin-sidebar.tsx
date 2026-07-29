import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import type { AdminUser } from "@/lib/admin/types";

type AdminSidebarProps = {
  admin: AdminUser;
};

export function AdminSidebar({ admin }: AdminSidebarProps) {
  return (
    <aside className="admin-shell hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="border-b border-sidebar-border px-4 py-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Админ-панель
        </p>
        <p className="mt-1.5 truncate text-sm font-medium text-sidebar-foreground">
          {admin.email}
        </p>
        <p className="text-xs text-muted-foreground">{admin.role}</p>
      </div>

      <AdminSidebarNav permissions={admin.permissions} />

      <form action={adminLogoutAction} className="mt-auto border-t border-sidebar-border p-2">
        <button
          type="submit"
          className="min-h-10 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          Выйти
        </button>
      </form>
    </aside>
  );
}
