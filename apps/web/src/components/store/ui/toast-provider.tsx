"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";

type ToastTone = "success" | "warning" | "error" | "info";

type ToastAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type ToastOptions = {
  tone?: ToastTone;
  message: string;
  action?: ToastAction;
};

type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
};

type ToastContextValue = {
  showToast: (messageOrOptions: string | ToastOptions, action?: ToastAction) => void;
};

const TONE_STYLES: Record<
  ToastTone,
  { icon: LucideIcon; iconClass: string; borderClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-store-success",
    borderClass: "border-store-success/20",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/30",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-destructive",
    borderClass: "border-destructive/30",
  },
  info: {
    icon: Info,
    iconClass: "text-primary",
    borderClass: "border-primary/20",
  },
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className={
        isAdmin
          ? "pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4 md:items-end md:px-6"
          : "pointer-events-none fixed inset-x-0 bottom-[calc(var(--store-mobile-nav-height)+0.75rem)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
      }
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const tone = TONE_STYLES[toast.tone];
        const Icon = tone.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg ring-1 ring-foreground/5 ${tone.borderClass}`}
            role="status"
          >
            <Icon className={`mt-0.5 size-5 shrink-0 ${tone.iconClass}`} aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">{toast.message}</p>
              {toast.action ? (
                toast.action.href ? (
                  <Link
                    href={toast.action.href}
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    {toast.action.label} →
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick?.();
                      onDismiss(toast.id);
                    }}
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    {toast.action.label}
                  </button>
                )
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Закрыть уведомление"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (messageOrOptions: string | ToastOptions, action?: ToastAction) => {
      const options: ToastOptions =
        typeof messageOrOptions === "string"
          ? { message: messageOrOptions, action, tone: "success" }
          : messageOrOptions;

      const id = crypto.randomUUID();
      setToasts((current) => [
        ...current,
        {
          id,
          tone: options.tone ?? "success",
          message: options.message,
          action: options.action,
        },
      ]);

      window.setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export type { ToastAction, ToastOptions, ToastTone };
