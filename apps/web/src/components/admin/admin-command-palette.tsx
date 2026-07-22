"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import {
  pullMoySkladCatalogAction,
  pullMoySkladStockAction,
} from "@/app/actions/admin-moysklad";
import { useToast } from "@/components/store/ui/toast-provider";
import {
  buildAdminCommands,
  getAdminCommandGroupLabel,
  groupAdminCommands,
  type AdminCommandItem,
} from "@/lib/admin/admin-commands";
import { cn } from "@/lib/utils";

type AdminCommandPaletteContextValue = {
  openPalette: () => void;
  togglePalette: () => void;
};

const AdminCommandPaletteContext = createContext<AdminCommandPaletteContextValue | null>(null);

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function AdminCommandPaletteDialog({
  open,
  onOpenChange,
  permissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: readonly string[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(
    () => buildAdminCommands(permissions, query),
    [permissions, query],
  );
  const grouped = useMemo(() => groupAdminCommands(commands), [commands]);
  const flatCommands = useMemo(
    () => grouped.flatMap((entry) => entry.items),
    [grouped],
  );

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const runCommand = useCallback(
    (command: AdminCommandItem) => {
      if (pending) return;

      if (command.href) {
        close();
        setQuery("");
        router.push(command.href);
        return;
      }

      if (command.id === "action-pull-stock") {
        startTransition(async () => {
          const result = await pullMoySkladStockAction();
          close();
          setQuery("");
          if (result.error) {
            showToast({ message: result.error, tone: "error" });
            return;
          }
          showToast({ message: result.message ?? "Остатки обновлены.", tone: "success" });
          router.refresh();
        });
        return;
      }

      if (command.id === "action-pull-catalog") {
        startTransition(async () => {
          const result = await pullMoySkladCatalogAction();
          close();
          setQuery("");
          if (result.error) {
            showToast({ message: result.error, tone: "error" });
            return;
          }
          showToast({ message: result.message ?? "Импорт завершён.", tone: "success" });
          router.refresh();
        });
      }
    },
    [close, pending, router, showToast],
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (flatCommands.length === 0) return 0;
      return Math.min(current, flatCommands.length - 1);
    });
  }, [flatCommands.length, query]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (flatCommands.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % flatCommands.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + flatCommands.length) % flatCommands.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const command = flatCommands[activeIndex];
        if (command) runCommand(command);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, close, flatCommands, open, runCommand]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-command-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh] sm:pt-[15vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Закрыть палитру команд"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Палитра команд"
        className="relative z-10 flex max-h-[min(70vh,560px)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск страниц, представлений, SKU, заказов…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Поиск команд"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="overflow-y-auto p-2">
          {flatCommands.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Ничего не найдено. Попробуйте SKU, номер заказа ORD-… или email клиента.
            </p>
          ) : (
            grouped.map((section) => (
              <div key={section.group} className="mb-2 last:mb-0">
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {getAdminCommandGroupLabel(section.group)}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((command) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const active = index === activeIndex;

                    return (
                      <li key={command.id}>
                        <button
                          type="button"
                          data-command-index={index}
                          disabled={pending}
                          className={cn(
                            "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                            active ? "bg-muted" : "hover:bg-muted/60",
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => runCommand(command)}
                        >
                          <span className="text-sm font-medium">{command.label}</span>
                          {command.description ? (
                            <span className="text-xs text-muted-foreground">
                              {command.description}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">↑↓ выбор · Enter выполнить · Esc закрыть</span>
          <span className="sm:hidden">Enter выполнить · Esc закрыть</span>
        </div>
      </div>
    </div>
  );
}

export function AdminCommandPaletteProvider({
  permissions,
  children,
}: {
  permissions: readonly string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const togglePalette = useCallback(() => setOpen((current) => !current), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePalette();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePalette]);

  const value = useMemo(
    () => ({ openPalette, togglePalette }),
    [openPalette, togglePalette],
  );

  return (
    <AdminCommandPaletteContext.Provider value={value}>
      {children}
      <AdminCommandPaletteDialog
        open={open}
        onOpenChange={setOpen}
        permissions={permissions}
      />
    </AdminCommandPaletteContext.Provider>
  );
}

export function AdminCommandPaletteTrigger({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const context = useContext(AdminCommandPaletteContext);
  if (!context) {
    throw new Error("AdminCommandPaletteTrigger must be used within AdminCommandPaletteProvider");
  }

  const shortcutLabel = isMacPlatform() ? "⌘K" : "Ctrl+K";

  return (
    <button
      type="button"
      onClick={context.openPalette}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        compact ? "size-11 justify-center px-0" : "px-2.5 py-1.5 text-xs",
        className,
      )}
      aria-label="Открыть палитру команд"
    >
      <Search className={compact ? "size-5" : "size-3.5"} aria-hidden />
      {!compact ? (
        <>
          <span className="hidden sm:inline">Команды</span>
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
            {shortcutLabel}
          </kbd>
        </>
      ) : null}
    </button>
  );
}
