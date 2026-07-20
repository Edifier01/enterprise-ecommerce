import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { listAdminProducts } from "@/lib/admin/catalog";
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

  const [summary, moyskladStatus, needsStylingResult, needsColorPhotosResult] = await Promise.all([
    getDashboardSummary(),
    getMoySkladStatus(),
    listAdminProducts(1, undefined, undefined, { needsStyling: true }),
    listAdminProducts(1, undefined, undefined, { needsColorPhotos: true }),
  ]);

  if (!summary) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Не удалось загрузить сводку. Проверьте доступ и повторите попытку.
      </p>
    );
  }

  return (
    <AdminDashboard
      summary={summary}
      pendingImports={moyskladStatus?.pending_imports ?? 0}
      needsStylingCount={needsStylingResult.ok ? needsStylingResult.data.total : 0}
      needsColorPhotosCount={
        needsColorPhotosResult.ok
          ? needsColorPhotosResult.data.total
          : (moyskladStatus?.needs_color_photos ?? 0)
      }
      moyskladStatus={moyskladStatus}
    />
  );
}
