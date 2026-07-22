import { redirect } from "next/navigation";

import {
  AdminCommandPaletteProvider,
  AdminCommandPaletteTrigger,
} from "@/components/admin/admin-command-palette";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getCurrentAdmin } from "@/lib/admin/session";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <AdminCommandPaletteProvider permissions={admin.permissions}>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar admin={admin} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminMobileNav admin={admin} />
          <header className="hidden items-center justify-between gap-4 border-b border-border px-6 py-4 md:flex">
            <p className="text-sm text-muted-foreground">Панель управления магазином</p>
            <AdminCommandPaletteTrigger />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AdminCommandPaletteProvider>
  );
}
