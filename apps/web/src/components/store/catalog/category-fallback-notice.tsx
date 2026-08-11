import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

type CategoryFallbackNoticeProps = {
  className?: string;
};

export function CategoryFallbackNotice({ className }: CategoryFallbackNoticeProps) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-lg border border-amber-500/30 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100",
        className,
      )}
    >
      {siteConfig.catalogDisclaimer}
    </p>
  );
}
