import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-8">
      <header className="border-b pb-6">
        <div className="h-9 w-72 animate-pulse rounded-md bg-muted" />
        <div className="mt-1 h-4 w-52 animate-pulse rounded bg-muted/60" />
      </header>

      <section>
        <div className="mb-4 h-6 w-28 animate-pulse rounded bg-muted" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-muted/60" />
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div className="h-7 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted/60" />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
