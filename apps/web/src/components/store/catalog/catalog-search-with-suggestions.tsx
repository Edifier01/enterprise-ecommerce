"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  fetchSearchSuggestions,
  type SearchSuggestions,
} from "@/lib/store/search-suggest-client";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

const inputClassName =
  "h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const headerInputClassName =
  "h-10 min-w-0 flex-1 rounded-none border-0 bg-muted/60 px-3 text-sm uppercase outline-none placeholder:normal-case focus-visible:ring-0 sm:h-11";

export type CatalogSearchWithSuggestionsProps = {
  defaultQuery?: string;
  variant?: "default" | "header";
  className?: string;
  onNavigate?: () => void;
};

export function CatalogSearchWithSuggestions({
  defaultQuery = "",
  variant = "default",
  className,
  onNavigate,
}: CatalogSearchWithSuggestionsProps) {
  const router = useRouter();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions(null);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await fetchSearchSuggestions(trimmed);
        setSuggestions(result);
        setOpen(
          result.products.length > 0 ||
            result.categories.length > 0 ||
            trimmed.length >= MIN_QUERY_LENGTH,
        );
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function navigateToSearch(q?: string) {
    const trimmed = (q ?? query).trim();
    setOpen(false);
    onNavigate?.();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateToSearch();
  }

  const hasResults =
    suggestions &&
    (suggestions.products.length > 0 || suggestions.categories.length > 0);

  const panel = open && query.trim().length >= MIN_QUERY_LENGTH ? (
    <div
      id={listboxId}
      role="listbox"
      className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
    >
      {loading ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Поиск…</p>
      ) : null}
      {!loading && hasResults ? (
        <ul className="max-h-72 overflow-y-auto py-1">
          {suggestions.categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/catalog/${category.slug}`}
                className="block px-3 py-2 text-sm hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              >
                <span className="text-xs text-muted-foreground">Категория · </span>
                {category.name}
              </Link>
            </li>
          ))}
          {suggestions.products.map((product) => (
            <li key={product.slug}>
              <Link
                href={`/products/${product.slug}`}
                className="block px-3 py-2 text-sm hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              >
                {product.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {!loading && !hasResults ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Ничего не найдено</p>
      ) : null}
      <button
        type="button"
        className="w-full border-t px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
        onClick={() => navigateToSearch()}
      >
        Все результаты по «{query.trim()}»
      </button>
    </div>
  ) : null;

  if (variant === "header") {
    return (
      <div ref={containerRef} className={cn("relative w-full min-w-0", className)}>
        <form
          className="flex w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-background"
          onSubmit={handleSubmit}
        >
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => query.trim().length >= MIN_QUERY_LENGTH && setOpen(true)}
            placeholder="НАЗВАНИЕ"
            autoComplete="off"
            className={headerInputClassName}
            aria-label="Поиск по каталогу"
            aria-expanded={open}
            aria-controls={listboxId}
          />
          <Button
            type="submit"
            className="h-10 shrink-0 rounded-none bg-store-cta px-4 text-store-cta-foreground hover:bg-store-cta/90 sm:h-11"
          >
            ПОИСК
          </Button>
        </form>
        {panel}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form className="relative w-full" onSubmit={handleSubmit}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => query.trim().length >= MIN_QUERY_LENGTH && setOpen(true)}
          placeholder="Название..."
          autoComplete="off"
          className={inputClassName}
          aria-label="Поиск по каталогу"
          aria-expanded={open}
          aria-controls={listboxId}
        />
      </form>
      {panel}
    </div>
  );
}
