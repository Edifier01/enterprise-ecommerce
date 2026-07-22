import type { Metadata } from "next";

import { redirect } from "next/navigation";



import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminFetchErrorState } from "@/components/admin/admin-error-state";

import { getAdminCatalogOverview } from "@/lib/admin/catalog";

import { getAdminInventoryOverview } from "@/lib/admin/inventory";

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



  const [summary, moyskladStatus, catalogOverview, inventoryOverview] = await Promise.all([

    getDashboardSummary(),

    getMoySkladStatus(),

    getAdminCatalogOverview(),

    getAdminInventoryOverview(),

  ]);



  if (!summary) {
    return (
      <AdminFetchErrorState
        message="Не удалось загрузить сводку. Проверьте доступ и повторите попытку."
        retryHref="/admin"
      />
    );
  }



  const catalog = catalogOverview.ok ? catalogOverview.data : null;



  return (

    <AdminDashboard

      summary={summary}

      pendingImports={moyskladStatus?.pending_imports ?? catalog?.uncategorized ?? 0}

      needsStylingCount={catalog?.needs_styling ?? 0}

      needsColorPhotosCount={catalog?.needs_color_photos ?? moyskladStatus?.needs_color_photos ?? 0}

      inventoryOverview={inventoryOverview.ok ? inventoryOverview.data : null}

      moyskladStatus={moyskladStatus}

    />

  );

}

