export default function AdminPanelLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Загрузка админ-панели">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted/70" />
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/30" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border bg-muted/25"
          />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/20" />
    </div>
  );
}