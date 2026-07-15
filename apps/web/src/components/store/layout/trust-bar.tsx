import { Award, Headphones, ShieldCheck, Truck } from "lucide-react";

import { siteConfig } from "@/lib/store/site-config";

const ICONS = {
  shield: ShieldCheck,
  truck: Truck,
  award: Award,
  support: Headphones,
} as const;

export function TrustBar() {
  const { trustBar } = siteConfig;

  return (
    <div
      className="border-b bg-muted/40"
      aria-label="Преимущества магазина"
    >
      <div className={siteConfig.layout.containerClass}>
        <ul className="flex gap-4 overflow-x-auto py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {trustBar.items.map((item) => {
            const Icon = ICONS[item.icon];

            return (
              <li
                key={item.label}
                className="flex min-w-[11rem] shrink-0 items-center gap-2.5 sm:min-w-0"
              >
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                    {item.label}
                  </p>
                  {item.description ? (
                    <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
