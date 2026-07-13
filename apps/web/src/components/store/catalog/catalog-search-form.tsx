"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

const inputClassName =
  "h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const compactInputClassName =
  "h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-sm sm:h-9";

export interface CatalogSearchFormProps {
  defaultQuery?: string;
  compact?: boolean;
}

export function CatalogSearchForm({
  defaultQuery = "",
  compact = false,
}: CatalogSearchFormProps) {
  const router = useRouter();

  return (
    <form
      className="relative w-full"
      action="/search"
      method="get"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const input = form.elements.namedItem("q");
        if (!(input instanceof HTMLInputElement)) {
          return;
        }
        const trimmed = input.value.trim();
        if (!trimmed) {
          event.preventDefault();
          router.push("/search");
        }
      }}
    >
      <Search
        className={
          compact
            ? "pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground sm:left-3 sm:size-4"
            : "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        }
        aria-hidden
      />
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder={compact ? "Поиск..." : "Поиск по каталогу..."}
        autoComplete="off"
        className={compact ? compactInputClassName : inputClassName}
        aria-label="Поиск по каталогу"
      />
    </form>
  );
}
