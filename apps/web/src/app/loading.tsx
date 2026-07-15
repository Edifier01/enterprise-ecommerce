import { siteConfig } from "@/lib/store/site-config";

export default function Loading() {
  return (
    <div className={siteConfig.layout.containerClass}>
      <div className="space-y-10 py-6 sm:space-y-12 sm:py-8">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl bg-muted sm:h-40"
            />
          ))}
        </div>

        <section className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <ul className={siteConfig.layout.productGridClass}>
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="min-w-0">
                <div className="overflow-hidden rounded-xl border bg-card">
                  <div className="aspect-square animate-pulse bg-muted" />
                  <div className="space-y-3 p-3 sm:p-4">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted/70" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                      <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
