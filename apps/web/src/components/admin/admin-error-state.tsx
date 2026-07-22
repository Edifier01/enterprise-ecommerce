import Link from "next/link";

import { ADMIN_PAGE_FORBIDDEN_MESSAGE } from "@/lib/admin/require-admin-permission";
import { cn } from "@/lib/utils";

type AdminErrorStateProps = {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
};

export function AdminErrorState({
  title,
  description,
  action,
  className,
}: AdminErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center",
        className,
      )}
      role="alert"
    >
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function AdminForbiddenState() {
  return (
    <AdminErrorState
      title="Недостаточно прав"
      description={ADMIN_PAGE_FORBIDDEN_MESSAGE}
      action={{ label: "На сводку", href: "/admin" }}
    />
  );
}

export function AdminFetchErrorState({
  message,
  retryHref,
}: {
  message: string;
  retryHref?: string;
}) {
  return (
    <AdminErrorState
      title="Не удалось загрузить данные"
      description={message}
      action={retryHref ? { label: "Повторить", href: retryHref } : undefined}
    />
  );
}
