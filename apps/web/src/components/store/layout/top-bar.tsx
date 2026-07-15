import Link from "next/link";
import { Check } from "lucide-react";

import { siteConfig } from "@/lib/store/site-config";

export function TopBar() {
  const { contact, topBar } = siteConfig;

  return (
    <div className="bg-primary text-primary-foreground text-xs sm:text-sm">
      <div className={siteConfig.layout.containerClass}>
        <div className="flex h-9 items-center justify-between gap-4 sm:h-10">
          <nav
            className="flex min-w-0 items-center gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
            aria-label="Информация для покупателей"
          >
            {topBar.links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 font-medium uppercase tracking-wide transition-opacity hover:opacity-80"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <Link
              href={topBar.orderStatus.href}
              className="hidden items-center gap-1.5 font-medium uppercase tracking-wide transition-opacity hover:opacity-80 sm:inline-flex"
            >
              <Check className="size-3.5" aria-hidden />
              {topBar.orderStatus.label}
            </Link>
            <a
              href={contact.phoneHref}
              className="font-semibold tabular-nums transition-opacity hover:opacity-80"
            >
              {contact.phone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
