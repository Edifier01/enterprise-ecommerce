import type { AdminProduct } from "@/lib/admin/catalog-shared";
import {
  getMerchandisingChecklistItems,
  getPublishBlockers,
  isReadyToPublish,
  type PublishBlocker,
} from "@/lib/admin/merchandising-readiness";
import { cn } from "@/lib/utils";

const BLOCKER_MESSAGES: Record<PublishBlocker, string> = {
  missing_category: "Назначьте категорию перед публикацией.",
  missing_photo: "Добавьте фото товара для витрины.",
  missing_color_photos: "Добавьте фото для всех цветов в галерее.",
};

const BLOCKER_LINKS: Partial<Record<PublishBlocker, { href: string; label: string }>> = {
  missing_category: { href: "#section-basics", label: "Назначить категорию" },
  missing_photo: { href: "#section-gallery", label: "Перейти к галерее" },
  missing_color_photos: { href: "#section-gallery", label: "Открыть матрицу цветов" },
};

const CHECKLIST_LINKS: Record<string, string> = {
  Категория: "#section-basics",
  Фото: "#section-gallery",
  "Цвета в галерее": "#section-gallery",
};

type AdminReadinessPanelProps = {
  product: AdminProduct;
  variant?: "default" | "compact";
  hideTitle?: boolean;
  className?: string;
};

export function AdminReadinessPanel({
  product,
  variant = "default",
  hideTitle = false,
  className,
}: AdminReadinessPanelProps) {
  const items = getMerchandisingChecklistItems(product);
  const blockers = getPublishBlockers(product);
  const ready = isReadyToPublish(product);
  const openCount = items.filter((item) => !item.done).length;

  if (variant === "compact") {
    return (
      <ul
        className={cn("space-y-1 text-xs text-muted-foreground", className)}
        aria-label="Чеклист оформления"
      >
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span aria-hidden className={item.done ? "text-emerald-600" : undefined}>
              {item.done ? "☑" : "☐"}
            </span>
            <span className={item.done ? "text-foreground" : undefined}>{item.label}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-muted/20 px-4 py-4",
        ready ? "border-emerald-200/60 bg-emerald-50/40" : "border-amber-200/60 bg-amber-50/30",
        className,
      )}
      aria-label="Готовность к публикации"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        {!hideTitle ? (
          <div>
            <h2 className="text-sm font-semibold text-foreground">Готовность к публикации</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {ready
                ? "Товар можно опубликовать на витрине."
                : openCount > 0
                  ? `${openCount} пункт(ов) осталось — перейдите по ссылкам ниже.`
                  : "Завершите пункты ниже, чтобы опубликовать без ошибок."}
            </p>
          </div>
        ) : null}
        {!hideTitle ? (
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
              ready
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-900",
            )}
          >
            {ready ? "Готов" : openCount > 0 ? `${openCount} проблем` : "Не готов"}
          </span>
        ) : null}
      </div>

      <ul className={cn(hideTitle ? "space-y-2" : "mt-4 space-y-2")}>
        {items.map((item) => {
          const href = !item.done ? CHECKLIST_LINKS[item.label] : undefined;
          return (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={item.done ? "text-emerald-600" : "text-muted-foreground"}
              >
                {item.done ? "☑" : "☐"}
              </span>
              {href ? (
                <a
                  href={href}
                  className="font-medium text-amber-950 underline underline-offset-2"
                >
                  {item.label}
                </a>
              ) : (
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {blockers.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-border/60 pt-3" role="list">
          {blockers.map((blocker) => (
            <li key={blocker} className="text-xs text-amber-900">
              {BLOCKER_MESSAGES[blocker]}
              {BLOCKER_LINKS[blocker] ? (
                <>
                  {" "}
                  <a href={BLOCKER_LINKS[blocker]!.href} className="font-medium underline underline-offset-2">
                    {BLOCKER_LINKS[blocker]!.label}
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
