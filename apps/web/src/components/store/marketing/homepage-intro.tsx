import Link from "next/link";

import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { label: "Каталог", href: "/catalog" },
  { label: "Новинки", href: "/catalog?sort=default" },
  { label: "Распродажа", href: "/catalog?on_sale=1" },
  { label: "Доставка", href: "/delivery" },
] as const;

export function HomepageIntro({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="homepage-intro-heading"
      className={cn("space-y-3 text-center sm:text-left", className)}
    >
      <div className="space-y-1.5">
        <h1 id="homepage-intro-heading" className="store-section-title text-2xl sm:text-3xl">
          {siteConfig.name}
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:mx-0 sm:text-base">
          {siteConfig.description}
        </p>
      </div>

      <nav aria-label="Быстрые ссылки" className="flex flex-wrap justify-center gap-2 sm:justify-start">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-10 items-center rounded-md border border-border bg-background px-3.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
