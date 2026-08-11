import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminFetchErrorState } from "@/components/admin/admin-error-state";
import { MoySkladIntegrationPanel } from "@/components/admin/integrations/moysklad-integration-panel";
import { getMoySkladStatus, listSyncLogs } from "@/lib/admin/integrations/moysklad";
import { getCurrentAdmin } from "@/lib/admin/session";
export const metadata: Metadata = {
  title: "МойСклад — Админ-панель",
  robots: { index: false, follow: false },
};

export default async function MoySkladIntegrationPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const [status, logs] = await Promise.all([getMoySkladStatus(), listSyncLogs()]);

  if (!status) {
    return (
      <AdminFetchErrorState
        message="Не удалось загрузить статус интеграции. Проверьте права доступа."
        retryHref="/admin/integrations/moysklad"
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Синхронизация МойСклад"
        description="Импорт каталога и остатков на сайт. Данные в МойСклад из админки не изменяются."
      />

      <MoySkladIntegrationPanel
        status={status}
        logs={logs ?? []}
        canWrite={admin.permissions.includes("integrations:write")}
      />
    </div>
  );
}
