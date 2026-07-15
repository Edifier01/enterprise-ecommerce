"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, LayoutGrid, X } from "lucide-react";

import type {
  HeaderCategory,
  HeaderCategoryNode,
} from "@/lib/store/header-categories";
import { cn } from "@/lib/utils";

function getItemHref(item: HeaderCategory): string {
  return item.href ?? `/catalog/${item.slug}`;
}

export function MobileCategoryDrawer({
  navItems,
  tree,
}: {
  navItems: HeaderCategory[];
  tree: HeaderCategoryNode[];
}) {
  const [open, setOpen] = useState(false);
  const treeBySlug = new Map(tree.map((node) => [node.slug, node]));

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-muted md:hidden"
        aria-expanded={open}
        aria-controls="mobile-category-drawer"
        onClick={() => setOpen(true)}
      >
        <LayoutGrid className="size-4" aria-hidden />
        Каталог
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Закрыть меню каталога"
            onClick={() => setOpen(false)}
          />
          <aside
            id="mobile-category-drawer"
            className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-background shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Каталог"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold uppercase tracking-wide">
                Каталог
              </p>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const node = treeBySlug.get(item.slug);
                  const children = node?.children ?? [];

                  return (
                    <li key={item.slug}>
                      <Link
                        href={getItemHref(item)}
                        className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                        onClick={() => setOpen(false)}
                      >
                        {item.name}
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                      </Link>
                      {children.length > 0 ? (
                        <ul className="mb-2 ml-3 border-l pl-3">
                          {children.map((child) => (
                            <li key={`${item.slug}-${child.slug}`}>
                              <Link
                                href={getItemHref(child)}
                                className={cn(
                                  "block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                                onClick={() => setOpen(false)}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border-t p-4">
              <Link
                href="/catalog"
                className="block rounded-md bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground"
                onClick={() => setOpen(false)}
              >
                Весь каталог
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
