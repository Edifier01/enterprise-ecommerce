import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MoySkladIntegrationPanel } from "@/components/admin/integrations/moysklad-integration-panel";
import { listAdminCategories } from "@/lib/admin/catalog";
import {
  getMoySkladStatus,
  listCategoryMappings,
  listSyncLogs,
} from "@/lib/admin/integrations/moysklad";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "МойСклад — Админ-панель",
  robots: { index: false, follow: false },
};

export default async function MoySkladIntegrationPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const [status, mappings, logs, categories] = await Promise.all([
    getMoySkladStatus(),
    listCategoryMappings(),
    listSyncLogs(),
    listAdminCategories(),
  ]);

  if (!status) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить статус интеграции. Проверьте права доступа.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Интеграция МойСклад</h1>
        <p className="text-sm text-muted-foreground">
          Импорт каталога и остатков на сайт. Данные в МойСклад из админки не изменяются.
        </p>
      </div>

      <MoySkladIntegrationPanel
        status={status}
        mappings={mappings ?? []}
        logs={logs ?? []}
        categories={categories ?? []}
      />
    </div>
  );
}
