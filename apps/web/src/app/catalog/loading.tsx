import { PageContainer } from "@/components/store/layout/page-container";
import { StoreProductGridSkeleton } from "@/components/store/ui/store-skeleton";

export default function CatalogLoading() {
  return (
    <PageContainer as="div" className="space-y-8" aria-busy="true" aria-label="Загрузка каталога">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded bg-muted/70" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <StoreProductGridSkeleton count={8} />
    </PageContainer>
  );
}
