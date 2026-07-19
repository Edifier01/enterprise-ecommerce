"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createCategoryMappingAction,
  deleteCategoryMappingAction,
  fullResyncMoySkladAction,
  pullMoySkladCatalogAction,
  pullMoySkladStockAction,
  setMoySkladWebhooksAction,
  type IntegrationActionState,
} from "@/app/actions/admin-moysklad";
import { AdminCategorySelect } from "@/components/admin/catalog/admin-category-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCategory } from "@/lib/admin/catalog-shared";
import type {
  CategoryMapping,
  MoySkladIntegrationStatus,
  SyncLogEntry,
} from "@/lib/admin/integrations/moysklad";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type MoySkladIntegrationPanelProps = {
  status: MoySkladIntegrationStatus;
  mappings: CategoryMapping[];
  logs: SyncLogEntry[];
  categories: AdminCategory[];
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function CategoryMappingForm({ categories }: { categories: AdminCategory[] }) {
  const [state, formAction, pending] = useActionState<
    IntegrationActionState,
    FormData
  >(createCategoryMappingAction, {});

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        Категория сайта
        <AdminCategorySelect name="category_id" categories={categories} defaultValue="" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        UUID папки МойСклад
        <input
          name="moysklad_folder_id"
          required
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className={inputClass}
        />
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Сохранение…" : "Добавить сопоставление"}
        </Button>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-green-700">Сохранено</p> : null}
      </div>
    </form>
  );
}

function MappingRow({
  mapping,
  categoryName,
}: {
  mapping: CategoryMapping;
  categoryName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-border/60">
      <td className="px-3 py-2">{categoryName}</td>
      <td className="px-3 py-2 font-mono text-xs">{mapping.moysklad_folder_id}</td>
      <td className="px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteCategoryMappingAction(mapping.id);
              router.refresh();
            })
          }
        >
          Удалить
        </Button>
      </td>
    </tr>
  );
}

export function MoySkladIntegrationPanel({
  status,
  mappings,
  logs,
  categories,
}: MoySkladIntegrationPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Статус интеграции</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Настроено:{" "}
            <span className="font-medium">{status.configured ? "да" : "нет"}</span>
          </p>
          <p>
            Режим каталога:{" "}
            <span className="font-medium">только чтение из МойСклад</span>
          </p>
          <p>
            Экспорт заказов:{" "}
            <span className="font-medium">
              {status.order_export_enabled ? "включён (site → MS)" : "выключен"}
            </span>
          </p>
          {status.pending_order_exports > 0 ? (
            <p className="text-amber-700">
              Заказов без экспорта: {status.pending_order_exports}
            </p>
          ) : null}
          <p>
            Склад: <span className="font-mono text-xs">{status.store_id ?? "—"}</span>
          </p>
          <p>Вебхуки на сайте: {status.webhooks_enabled ? "включены" : "выключены"}</p>
          <p>Последний полный импорт: {formatDate(status.last_full_sync_at)}</p>
          <p>Последняя инкрементальная синхронизация: {formatDate(status.last_incremental_sync_at)}</p>
          <p>Ошибок за 24 ч: {status.errors_last_24h}</p>
          {status.last_error ? (
            <p className="text-destructive">Последняя ошибка: {status.last_error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              disabled={pending || !status.configured}
              onClick={() =>
                startTransition(async () => {
                  const result = await pullMoySkladCatalogAction();
                  setMessage(result.message ?? result.error ?? null);
                  router.refresh();
                })
              }
            >
              Импорт каталога и остатков
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !status.configured}
              onClick={() =>
                startTransition(async () => {
                  const result = await pullMoySkladStockAction();
                  setMessage(result.message ?? result.error ?? null);
                  router.refresh();
                })
              }
            >
              Обновить остатки
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !status.configured}
              onClick={() =>
                startTransition(async () => {
                  const result = await fullResyncMoySkladAction();
                  setMessage(result.message ?? result.error ?? null);
                  router.refresh();
                })
              }
            >
              Полная синхронизация
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setMoySkladWebhooksAction(!status.webhooks_enabled);
                  router.refresh();
                })
              }
            >
              {status.webhooks_enabled ? "Выключить вебхуки" : "Включить вебхуки"}
            </Button>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Сопоставление категорий</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Свяжите папку товаров в МойСклад с категорией на сайте. При импорте товары попадут в
            указанную категорию.
          </p>
          <CategoryMappingForm categories={categories} />
          {mappings.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2">Категория</th>
                  <th className="px-3 py-2">Папка MS</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <MappingRow
                    key={mapping.id}
                    mapping={mapping}
                    categoryName={categoryNameById.get(mapping.category_id) ?? mapping.category_id}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">Сопоставлений пока нет.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Журнал синхронизации</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Записей пока нет.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2">Время</th>
                    <th className="px-3 py-2">Тип</th>
                    <th className="px-3 py-2">Статус</th>
                    <th className="px-3 py-2">Ошибка</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/60">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="px-3 py-2">
                        {log.entity_type}
                        {log.entity_id ? ` (${log.entity_id.slice(0, 8)}…)` : ""}
                      </td>
                      <td className="px-3 py-2">{log.status}</td>
                      <td className="px-3 py-2 text-destructive">{log.error_message ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
