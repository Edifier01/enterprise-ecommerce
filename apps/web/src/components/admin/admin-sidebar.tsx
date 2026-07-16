import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import type { AdminUser } from "@/lib/admin/types";

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

      <AdminSidebarNav />

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
