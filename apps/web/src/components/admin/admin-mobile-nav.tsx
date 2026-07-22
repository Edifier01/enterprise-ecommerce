"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminCommandPaletteTrigger } from "@/components/admin/admin-command-palette";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import type { AdminUser } from "@/lib/admin/types";
import { usePathname } from "next/navigation";

export function AdminMobileNav({ admin }: { admin: AdminUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
            aria-expanded={open}
            aria-controls="admin-mobile-nav"
            aria-label="Меню админ-панели"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <AdminCommandPaletteTrigger compact />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-sm font-medium">{admin.email}</p>
          <p className="text-xs text-muted-foreground">{admin.role}</p>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          />
          <aside
            id="admin-mobile-nav"
            className="absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col bg-background shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Навигация админ-панели"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Админ-панель
                </p>
                <p className="truncate text-sm font-medium">{admin.email}</p>
              </div>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <AdminSidebarNav
              permissions={admin.permissions}
              onNavigate={() => setOpen(false)}
              className="overflow-y-auto p-3"
            />

            <form action={adminLogoutAction} className="border-t border-border p-3">
              <button
                type="submit"
                className="min-h-11 w-full rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Выйти
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
