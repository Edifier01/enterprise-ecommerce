export default function AdminPanelLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded-md bg-muted" />
      </div>
      <div className="h-64 rounded-xl border border-border bg-muted/30" />
    </div>
  );
}
