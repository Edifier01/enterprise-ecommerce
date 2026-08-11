import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

type StoreProductCardSkeletonProps = {
  className?: string;
};

export function StoreProductCardSkeleton({ className }: StoreProductCardSkeletonProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
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
  );
}

type StoreProductGridSkeletonProps = {
  count?: number;
  className?: string;
  listClassName?: string;
};

export function StoreProductGridSkeleton({
  count = 8,
  className,
  listClassName,
}: StoreProductGridSkeletonProps) {
  return (
    <ul className={cn(siteConfig.layout.productGridClass, listClassName, className)}>
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="min-w-0">
          <StoreProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function StoreInlineSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-4 w-full max-w-xs animate-pulse rounded bg-muted", className)}
      aria-hidden
    />
  );
}
