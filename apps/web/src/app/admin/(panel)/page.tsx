import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getMoySkladStatus } from "@/lib/admin/integrations/moysklad";
import { getCurrentAdmin, getDashboardSummary } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Сводка — Админ-панель",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const [summary, moyskladStatus] = await Promise.all([
    getDashboardSummary(),
    getMoySkladStatus(),
  ]);
  if (!summary) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить сводку. Проверьте доступ и повторите попытку.
      </p>
    );
  }

  return (
    <AdminDashboard
      summary={summary}
      pendingImports={moyskladStatus?.pending_imports ?? 0}
    />
  );
}
