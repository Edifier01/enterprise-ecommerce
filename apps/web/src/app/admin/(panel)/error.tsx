"use client";

import Link from "next/link";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminPanelError({ reset }: AdminErrorProps) {
  return (
    <div
      className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center"
      role="alert"
    >
      <h2 className="text-base font-semibold text-foreground">Ошибка в админ-панели</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Не удалось загрузить раздел. Повторите попытку или откройте сводку.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Повторить
        </button>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          К сводке
        </Link>
      </div>
    </div>
  );
}
