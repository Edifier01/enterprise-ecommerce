"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

const inputClassName =
  "h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export interface CatalogSearchFormProps {
  defaultQuery?: string;
}

export function CatalogSearchForm({ defaultQuery = "" }: CatalogSearchFormProps) {
  const router = useRouter();

  return (
    <form
      className="relative"
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
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Поиск по каталогу..."
        autoComplete="off"
        className={inputClassName}
        aria-label="Поиск по каталогу"
      />
    </form>
  );
}
