"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const inputClassName =
  "h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SearchPlaceholder() {
  const [query, setQuery] = useState("");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по каталогу..."
          autoComplete="off"
          className={inputClassName}
          aria-label="Поиск по каталогу"
        />
      </form>

      <div className="rounded-xl border bg-muted/30 p-6 text-center">
        <p className="text-sm font-medium text-foreground">Поиск скоро будет доступен</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {query.trim()
            ? `По запросу «${query.trim()}» пока ничего не найдено. Функция поиска появится в следующих обновлениях.`
            : "Мы работаем над полнотекстовым поиском по товарам. Пока воспользуйтесь каталогом или перейдите на главную."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          render={<Link href="/catalog" />}
        >
          Перейти в каталог
        </Button>
      </div>
    </div>
  );
}
