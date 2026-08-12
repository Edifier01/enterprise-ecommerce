import { PageContainer } from "@/components/store/layout/page-container";

export default function ProductLoading() {
  return (
    <PageContainer
      as="div"
      className="space-y-8"
      aria-busy="true"
      aria-label="Загрузка товара"
    >
      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-xl bg-muted" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 max-w-md animate-pulse rounded bg-muted" />
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted/70" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted/70" />
          <div className="mt-6 h-11 w-full max-w-xs animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </PageContainer>
  );
}
