"use client";

import { Search, X } from "lucide-react";
import { createContext, useContext, useState } from "react";

import { CatalogSearchWithSuggestions } from "@/components/store/catalog/catalog-search-with-suggestions";
import { cn } from "@/lib/utils";

type MobileSearchContextValue = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const MobileSearchContext = createContext<MobileSearchContextValue | null>(null);

export function MobileSearchProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <MobileSearchContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {children}
    </MobileSearchContext.Provider>
  );
}

export function MainHeaderSearchToggle() {
  const ctx = useContext(MobileSearchContext);
  if (!ctx) {
    return null;
  }
  const { mobileOpen, setMobileOpen } = ctx;

  return (
    <button
      type="button"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-input bg-background text-foreground hover:bg-muted md:hidden"
      aria-label={mobileOpen ? "Скрыть поиск" : "Открыть поиск"}
      aria-expanded={mobileOpen}
      onClick={() => setMobileOpen(!mobileOpen)}
    >
      {mobileOpen ? <X className="size-5" aria-hidden /> : <Search className="size-5" aria-hidden />}
    </button>
  );
}

export function MainHeaderSearchPanel({ className }: { className?: string }) {
  const ctx = useContext(MobileSearchContext);
  if (!ctx) {
    return null;
  }
  const { mobileOpen, setMobileOpen } = ctx;

  return (
    <>
      <div
        className={cn(
          "hidden min-w-0 md:col-start-2 md:block md:max-w-2xl md:justify-self-center lg:max-w-3xl",
          className,
        )}
      >
        <CatalogSearchWithSuggestions variant="header" />
      </div>
      {mobileOpen ? (
        <div className="w-full min-w-0 md:hidden">
          <CatalogSearchWithSuggestions
            variant="header"
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
}
