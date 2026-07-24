"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteCartLine,
  getCheckoutErrorMessage,
  type Cart,
  updateCartLine,
} from "@/lib/checkout/api";
import { dispatchCartUpdated } from "@/lib/checkout/cart-events";
import { useCartSummary } from "@/lib/checkout/use-cart-summary";
import { formatPrice } from "@/lib/store/format";
import { cn } from "@/lib/utils";

export function CartHeaderSummary() {
  const { itemCount, totalLabel, cart, refresh } = useCartSummary();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function mutate(action: () => Promise<Cart>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        dispatchCartUpdated();
        refresh();
      } catch (err) {
        setError(getCheckoutErrorMessage(err, "Не удалось обновить корзину"));
      }
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground transition-colors hover:text-primary sm:text-sm"
        aria-label={`Корзина: ${itemCount} товаров, ${totalLabel}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((value) => !value);
          refresh();
        }}
      >
        <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShoppingCart className="size-4" aria-hidden />
          {itemCount > 0 ? (
            <span
              className={cn(
                "absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full",
                "bg-destructive px-1 text-[10px] font-bold leading-5 text-destructive-foreground",
              )}
              aria-hidden
            >
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          ) : null}
        </span>
        <span className="hidden sm:inline">
          Товаров {itemCount} ({totalLabel})
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Мини-корзина"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border bg-background p-3 shadow-md"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Корзина</p>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Закрыть"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {!cart || cart.lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Корзина пуста
            </p>
          ) : (
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {cart.lines.map((line) => {
                const name =
                  line.product_snapshot.product_name ??
                  line.product_snapshot.sku ??
                  "Товар";
                const variant =
                  line.product_snapshot.name ?? line.product_snapshot.variant_name;
                return (
                  <div key={line.id} className="space-y-2 border-b pb-3 last:border-b-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{name}</p>
                        {variant ? (
                          <p className="text-xs text-muted-foreground">{variant}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-medium">
                        {formatPrice(line.line_total_cents, line.currency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1 rounded-md border">
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center disabled:opacity-50"
                          disabled={isPending || line.quantity <= 1}
                          aria-label="Уменьшить количество"
                          onClick={() =>
                            mutate(() => updateCartLine(line.id, line.quantity - 1))
                          }
                        >
                          <Minus className="size-3.5" aria-hidden />
                        </button>
                        <span className="min-w-6 text-center text-sm">{line.quantity}</span>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center disabled:opacity-50"
                          disabled={isPending}
                          aria-label="Увеличить количество"
                          onClick={() =>
                            mutate(() => updateCartLine(line.id, line.quantity + 1))
                          }
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50"
                        disabled={isPending}
                        aria-label="Удалить товар"
                        onClick={() => mutate(() => deleteCartLine(line.id))}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm font-semibold">
            <span>Итого</span>
            <span>{totalLabel}</span>
          </div>

          <div className="mt-3 grid gap-2">
            <Button
              size="sm"
              className="bg-store-cta text-store-cta-foreground hover:bg-store-cta/90"
              render={<Link href="/cart" onClick={() => setOpen(false)} />}
            >
              Перейти в корзину
            </Button>
            {cart && cart.lines.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                render={<Link href="/checkout" onClick={() => setOpen(false)} />}
              >
                Оформить заказ
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
