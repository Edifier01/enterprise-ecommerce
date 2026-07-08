import { siteConfig } from "@/lib/store/site-config";

export function TrustBar() {
  return (
    <div className="border-b bg-secondary/40">
      <div className={siteConfig.layout.containerClass}>
        <ul className="flex gap-4 overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
          {siteConfig.trustBar.map((item) => (
            <li key={item.title} className="min-w-[9rem] shrink-0 sm:min-w-0">
              <p className="text-xs font-medium text-foreground sm:text-sm">
                {item.title}
              </p>
              {item.description ? (
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                  {item.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
