import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminWorkflowActionQueue,
  type AdminWorkflowQueueItem,
} from "@/components/admin/catalog/admin-workflow-action-queue";
import {
  AdminWorkflowBoard,
  type AdminWorkflowLane,
} from "@/components/admin/catalog/admin-workflow-board";
import { AdminErrorState } from "@/components/admin/admin-error-state";
import { getAdminCatalogOverview } from "@/lib/admin/catalog";
import { buildAdminCatalogListHref } from "@/lib/admin/catalog-list-url";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Оформление товаров — Админ-панель",
  robots: { index: false, follow: false },
};

export default async function AdminCatalogWorkflowPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const overviewResult = await getAdminCatalogOverview();

  if (!overviewResult.ok) {
    return (
      <AdminErrorState
        title="Не удалось загрузить сводку каталога"
        description={overviewResult.error}
        action={{ label: "Обновить", href: "/admin/catalog/workflow" }}
      />
    );
  }

  const overview = overviewResult.data;

  const queueItems: AdminWorkflowQueueItem[] = [
    {
      id: "uncategorized",
      problem: "Нет категории",
      detail: "Товары из МойСклад скрыты с витрины до назначения категории.",
      count: overview.uncategorized,
      href: "/admin/integrations/moysklad/import",
      ctaLabel: "Открыть импорт",
      tone: "warning",
      secondaryHref: buildAdminCatalogListHref({ uncategorized: true }),
      secondaryLabel: "Список в каталоге",
    },
    {
      id: "needs_styling",
      problem: "Требует оформления",
      detail: "Черновики без фото или описания.",
      count: overview.needs_styling,
      href: buildAdminCatalogListHref({ showAll: true, needsStyling: true }),
      ctaLabel: "Открыть список",
      tone: "warning",
    },
    {
      id: "needs_color_photos",
      problem: "Фото по цветам",
      detail: "Неполная галерея для цветовых вариантов.",
      count: overview.needs_color_photos,
      href: buildAdminCatalogListHref({ showAll: true, needsColorPhotos: true }),
      ctaLabel: "Открыть список",
      tone: "warning",
    },
    {
      id: "ready",
      problem: "Готовы к публикации",
      detail: "Категория и фото есть — можно активировать статус «Активен».",
      count: overview.ready_to_publish,
      href: buildAdminCatalogListHref({ showAll: true, status: "draft" }),
      ctaLabel: "Опубликовать",
      tone: "success",
    },
  ];

  const statusLanes: AdminWorkflowLane[] = [
    {
      id: "draft",
      title: "Черновики",
      description: "Товары ещё не опубликованы на витрине.",
      count: overview.draft,
      href: buildAdminCatalogListHref({ showAll: true, status: "draft" }),
    },
    {
      id: "active",
      title: "Опубликованы",
      description: "Активные товары с категорией на витрине.",
      count: overview.active,
      href: buildAdminCatalogListHref({ showAll: true, status: "active" }),
      tone: "success",
    },
    {
      id: "archived",
      title: "Скрыты с витрины",
      description: "Архивные товары и скрытые позиции.",
      count: overview.archived,
      href: buildAdminCatalogListHref({ showAll: true, status: "archived" }),
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Оформление товаров"
        description={`Action queue merchandising — ${overview.total} товаров из МойСклад.`}
        breadcrumb={
          <Link
            href="/admin/catalog?all=1"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← К каталогу
          </Link>
        }
      />

      <AdminWorkflowActionQueue items={queueItems} />

      <section aria-labelledby="workflow-status-heading" className="space-y-4">
        <div>
          <h2 id="workflow-status-heading" className="text-sm font-semibold">
            Статусы каталога
          </h2>
          <p className="text-xs text-muted-foreground">
            Быстрые представления по статусу публикации.
          </p>
        </div>
        <AdminWorkflowBoard lanes={statusLanes} />
      </section>
    </div>
  );
}
