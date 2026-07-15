"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

import type {
  HeaderCategory,
  HeaderCategoryNode,
} from "@/lib/store/header-categories";
import { cn } from "@/lib/utils";

function getItemHref(item: HeaderCategory): string {
  return item.href ?? `/catalog/${item.slug}`;
}

function isItemActive(pathname: string, item: HeaderCategory): boolean {
  if (item.href === "/" || item.slug === "novinki") {
    return pathname === "/";
  }

  return (
    pathname === `/catalog/${item.slug}` ||
    pathname.startsWith(`/catalog/${item.slug}/`)
  );
}

export function CategoryMegaMenuNav({
  navItems,
  tree,
}: {
  navItems: HeaderCategory[];
  tree: HeaderCategoryNode[];
}) {
  const pathname = usePathname();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  const treeBySlug = new Map(tree.map((node) => [node.slug, node]));

  function clearCloseTimer() {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpenSlug(null), 120);
  }

  function openMenu(slug: string) {
    clearCloseTimer();
    setOpenSlug(slug);
  }

  useEffect(() => () => clearCloseTimer(), []);

  if (navItems.length === 0) {
    return null;
  }

  const activeNode = openSlug ? treeBySlug.get(openSlug) : undefined;

  return (
    <nav
      className="relative"
      aria-label="Категории каталога"
      onMouseLeave={scheduleClose}
    >
      <ul className="flex min-w-full items-stretch overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map((item, index) => {
          const active = isItemActive(pathname, item);
          const hasChildren = (treeBySlug.get(item.slug)?.children.length ?? 0) > 0;
          const isOpen = openSlug === item.slug;

          return (
            <li
              key={item.slug}
              className="flex shrink-0 items-stretch"
              onMouseEnter={() => {
                if (hasChildren) {
                  openMenu(item.slug);
                } else {
                  setOpenSlug(null);
                }
              }}
            >
              {index > 0 ? (
                <span
                  className="mx-0.5 w-px self-stretch bg-border sm:mx-1"
                  aria-hidden
                />
              ) : null}
              <Link
                href={getItemHref(item)}
                aria-current={active ? "page" : undefined}
                aria-haspopup={hasChildren ? "true" : undefined}
                aria-expanded={hasChildren ? isOpen : undefined}
                className={cn(
                  "flex items-center px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors sm:px-4 sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted hover:text-foreground",
                  isOpen && !active && "bg-muted",
                )}
              >
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>

      {activeNode && activeNode.children.length > 0 ? (
        <div
          className="absolute inset-x-0 top-full z-50 border-b bg-background shadow-md"
          onMouseEnter={clearCloseTimer}
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {activeNode.name}
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {activeNode.children.map((child) => (
                    <li key={`${activeNode.slug}-${child.slug}`}>
                      <Link
                        href={getItemHref(child)}
                        className="group flex items-center gap-1 text-sm font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {child.name}
                        <ChevronRight
                          className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={getItemHref(activeNode)}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                Весь раздел →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
