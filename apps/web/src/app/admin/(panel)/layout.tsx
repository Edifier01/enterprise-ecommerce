import { redirect } from "next/navigation";

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
    <div className="flex min-h-screen bg-background">
      <AdminSidebar admin={admin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileNav admin={admin} />
        <header className="hidden border-b border-border px-6 py-4 md:block">
          <p className="text-sm text-muted-foreground">Панель управления магазином</p>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
