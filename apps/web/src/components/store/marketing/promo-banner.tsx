import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

export type PromoBannerItem = {
  title: string;
  description?: string;
  href: string;
  ctaLabel?: string;
  /** Tailwind gradient / background classes */
  accentClass?: string;
};

const DEFAULT_PROMO_BANNERS: PromoBannerItem[] = [
  {
    title: "Разгрузочные системы",
    description: "Plate carriers, подсумки и комплекты для полевых задач",
    href: "/catalog",
    ctaLabel: "Смотреть снаряжение",
    accentClass: "from-primary/95 to-primary store-hero-pattern",
  },
  {
    title: "Подготовка к сезону",
    description: "Термобельё, мембрана и тактическая обувь — выгодные цены",
    href: "/catalog",
    ctaLabel: "В каталог",
    accentClass: "from-stone-700/95 to-stone-800 store-hero-pattern",
  },
];

export interface PromoBannerProps {
  items?: PromoBannerItem[];
  className?: string;
}

export function PromoBanner({
  items = DEFAULT_PROMO_BANNERS,
  className,
}: PromoBannerProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Промо-баннеры"
      className={cn(
        "grid gap-3 sm:grid-cols-2 sm:gap-4",
        className
      )}
    >
      {items.map((item) => (
        <article
          key={item.title}
          className={cn(
            "relative overflow-hidden rounded-xl bg-gradient-to-br px-5 py-6 text-primary-foreground sm:px-6 sm:py-8",
            item.accentClass ?? "from-primary/90 to-primary"
          )}
        >
          <div className="relative z-10 max-w-md space-y-2">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              {item.title}
            </h2>
            {item.description ? (
              <p className="text-sm text-primary-foreground/85 sm:text-base">
                {item.description}
              </p>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 bg-background/95 text-foreground hover:bg-background"
              render={<Link href={item.href} />}
            >
              {item.ctaLabel ?? "Подробнее"}
            </Button>
          </div>
          <div
            className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10 sm:size-40"
            aria-hidden
          />
        </article>
      ))}

      <p className="sr-only">{siteConfig.name}</p>
    </section>
  );
}
