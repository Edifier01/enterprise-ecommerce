import { PageContainer } from "@/components/store/layout/page-container";
import { StoreProductGridSkeleton } from "@/components/store/ui/store-skeleton";

export default function Loading() {
  return (
    <PageContainer as="div" className="space-y-8 sm:space-y-10">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4" aria-hidden>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted sm:h-32" />
        ))}
      </div>
      <section className="space-y-4" aria-busy="true" aria-label="Загрузка">
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <StoreProductGridSkeleton count={8} />
      </section>
    </PageContainer>
  );
}
