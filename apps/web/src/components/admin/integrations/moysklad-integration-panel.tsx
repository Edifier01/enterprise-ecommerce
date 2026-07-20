"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  fullResyncMoySkladAction,
  pullMoySkladCatalogAction,
  pullMoySkladStockAction,
  setMoySkladWebhooksAction,
  type IntegrationActionState,
} from "@/app/actions/admin-moysklad";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoySkladIntegrationStatus, SyncLogEntry } from "@/lib/admin/integrations/moysklad";
import { cn } from "@/lib/utils";

type MoySkladIntegrationPanelProps = {
  status: MoySkladIntegrationStatus;
  logs: SyncLogEntry[];
  canWrite?: boolean;
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

export function MoySkladIntegrationPanel({
  status,
  logs,
  canWrite = false,
}: MoySkladIntegrationPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        <Link
          href="/admin/integrations/moysklad"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Статус
        </Link>
        <Link
          href="/admin/integrations/moysklad/import"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Импорт товаров
          {status.pending_imports > 0 ? ` (${status.pending_imports})` : ""}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Статус интеграции</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Настроено:{" "}
            <span className="font-medium">{status.configured ? "да" : "нет"}</span>
          </p>
          {!status.configured ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              <p className="font-medium">Импорт недоступен — не заданы переменные окружения API.</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {!status.api_token_configured ? <li>MOYSKLAD_API_TOKEN — не задан</li> : null}
                {!status.store_id_configured ? <li>MOYSKLAD_STORE_ID — не задан</li> : null}
              </ul>
              <p className="mt-2 text-xs">
                На сервере добавьте их в <code className="font-mono">.env.production</code> и
                перезапустите деплой (<code className="font-mono">docker compose up -d api</code>).
              </p>
            </div>
          ) : null}
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
          {status.pending_imports > 0 ? (
            <p className="text-amber-700">
              Товаров без категории: {status.pending_imports}{" "}
              <Link
                href="/admin/integrations/moysklad/import"
                className="underline underline-offset-2"
              >
                Оформить
              </Link>
            </p>
          ) : null}
          <p>
            Склад: <span className="font-mono text-xs">{status.store_id ?? "—"}</span>
          </p>
          <p>Вебхуки на сайте: {status.webhooks_enabled ? "включены" : "выключены"}</p>
          <p>Последний полный импорт: {formatDate(status.last_full_sync_at)}</p>
          <p>
            Последняя инкрементальная синхронизация:{" "}
            {formatDate(status.last_incremental_sync_at)}
          </p>
          <p>Ошибок за 24 ч: {status.errors_last_24h}</p>
          {status.last_error ? (
            <p className="text-destructive">Последняя ошибка: {status.last_error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            {canWrite ? (
              <>
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
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Синхронизация доступна только администраторам с правом интеграций.
              </p>
            )}
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
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
