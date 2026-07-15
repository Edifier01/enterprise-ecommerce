"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const compactInputClassName =
  "h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-sm sm:h-9";

const headerInputClassName =
  "h-10 min-w-0 flex-1 rounded-none border-0 bg-muted/60 px-3 text-sm uppercase outline-none placeholder:normal-case focus-visible:ring-0 sm:h-11";

export interface CatalogSearchFormProps {
  defaultQuery?: string;
  compact?: boolean;
  variant?: "default" | "header";
}

export function CatalogSearchForm({
  defaultQuery = "",
  compact = false,
  variant = "default",
}: CatalogSearchFormProps) {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
  }

  if (variant === "header") {
    return (
      <form
        className="flex w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-background"
        action="/search"
        method="get"
        onSubmit={handleSubmit}
      >
        <input
          type="search"
          name="q"
          defaultValue={defaultQuery}
          placeholder="АРТИКУЛ ИЛИ НАЗВАНИЕ"
          autoComplete="off"
          className={headerInputClassName}
          aria-label="Поиск по каталогу"
        />
        <Button
          type="submit"
          className="h-10 shrink-0 rounded-none bg-store-cta px-4 text-store-cta-foreground hover:bg-store-cta/90 sm:h-11"
        >
          ПОИСК
        </Button>
      </form>
    );
  }

  return (
    <form
      className="relative w-full"
      action="/search"
      method="get"
      onSubmit={handleSubmit}
    >
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          compact
            ? "left-2.5 size-3.5 sm:left-3 sm:size-4"
            : "left-3 size-4",
        )}
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
