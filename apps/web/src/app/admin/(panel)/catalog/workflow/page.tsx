import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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

  const lanes: AdminWorkflowLane[] = [
    {
      id: "import_queue",
      title: "Новые из МойСклад",
      description: "Товары без категории — не видны на витрине.",
      count: overview.uncategorized,
      href: "/admin/integrations/moysklad/import",
      tone: "warning",
    },
    {
      id: "no_category",
      title: "Без категории",
      description: "Назначьте категорию перед публикацией.",
      count: overview.uncategorized,
      href: buildAdminCatalogListHref({ uncategorized: true }),
      tone: "warning",
    },
    {
      id: "needs_styling",
      title: "Требует оформления",
      description: "Черновики без фото или описания.",
      count: overview.needs_styling,
      href: buildAdminCatalogListHref({ showAll: true, needsStyling: true }),
      tone: "warning",
    },
    {
      id: "needs_color_photos",
      title: "Фото по цветам",
      description: "Не хватает галереи для цветовых вариантов.",
      count: overview.needs_color_photos,
      href: buildAdminCatalogListHref({ showAll: true, needsColorPhotos: true }),
      tone: "warning",
    },
    {
      id: "ready",
      title: "Готовы к публикации",
      description: "Категория и фото есть — можно активировать.",
      count: overview.ready_to_publish,
      href: buildAdminCatalogListHref({ showAll: true, status: "draft" }),
      tone: "success",
    },
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
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/catalog?all=1"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← К каталогу
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Оформление товаров</h1>
        <p className="text-sm text-muted-foreground">
          Очереди merchandising — {overview.total} товаров из МойСклад.
        </p>
      </div>

      <AdminWorkflowBoard lanes={lanes} />
    </div>
  );
}
