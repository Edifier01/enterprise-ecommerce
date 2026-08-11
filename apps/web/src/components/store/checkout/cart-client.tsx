"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { CartLinePreview } from "@/components/store/checkout/cart-line-preview";
import { StoreEmptyState } from "@/components/store/ui/store-empty-state";
import { StoreErrorState } from "@/components/store/ui/store-error-state";
import { StoreInlineSkeleton } from "@/components/store/ui/store-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteCartLine,
  getCheckoutErrorMessage,
  getCart,
  type Cart,
  updateCartLine,
} from "@/lib/checkout/api";
import { dispatchCartUpdated } from "@/lib/checkout/cart-events";
import { resolveCartCurrency } from "@/lib/checkout/cart-line-display";
import { formatPrice } from "@/lib/store/format";

export function CartClient() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    getCart()
      .then((nextCart) => {
        if (mounted) setCart(nextCart);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить корзину");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  function mutateCart(action: () => Promise<Cart>) {
    setError(null);
    startTransition(async () => {
      try {
        setCart(await action());
        dispatchCartUpdated();
      } catch (err) {
        setError(getCheckoutErrorMessage(err, "Не удалось обновить корзину"));
      }
    });
  }

  if (!cart && error) {
    return (
      <StoreErrorState
        title="Не удалось загрузить корзину"
        description={error}
        onRetry={() => {
          setError(null);
          getCart()
            .then(setCart)
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Не удалось загрузить корзину");
            });
        }}
        action={{ label: "В каталог", href: "/catalog" }}
      />
    );
  }

  if (!cart) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10">
          <StoreInlineSkeleton className="mx-auto" />
          <p className="text-center text-sm text-muted-foreground">Загружаем корзину...</p>
        </CardContent>
      </Card>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <StoreEmptyState
        title="Корзина пуста"
        description="Добавьте товары из каталога, чтобы перейти к оформлению заказа."
        action={{ label: "Перейти в каталог", href: "/catalog" }}
      />
    );
  }

  const currency = resolveCartCurrency(cart.currency, cart.lines[0]?.currency);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {error ? (
        <StoreErrorState
          title="Ошибка корзины"
          description={error}
          className="lg:col-span-2"
        />
      ) : null}
      <div className="space-y-3">
        {cart.lines.map((line) => (
          <Card key={line.id}>
            <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <CartLinePreview snapshot={line.product_snapshot} />
                <p className="text-sm font-semibold">
                  {formatPrice(line.unit_price_cents, resolveCartCurrency(line.currency, currency))}
                </p>
              </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex items-center rounded-lg border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      disabled={isPending}
                      onClick={() =>
                        mutateCart(() =>
                          updateCartLine(line.id, Math.max(0, line.quantity - 1))
                        )
                      }
                      aria-label="Уменьшить количество"
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="min-w-8 text-center text-sm">{line.quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      disabled={isPending}
                      onClick={() => mutateCart(() => updateCartLine(line.id, line.quantity + 1))}
                      aria-label="Увеличить количество"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    disabled={isPending}
                    onClick={() => mutateCart(() => deleteCartLine(line.id))}
                    aria-label="Удалить товар"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
        ))}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Итого</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Товары</span>
            <span className="font-semibold">{formatPrice(cart.subtotal_cents, currency)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-4 text-base font-semibold">
            <span>К оплате</span>
            <span>{formatPrice(cart.total_cents, currency)}</span>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="button"
            size="lg"
            disabled={isPending}
            className="hidden w-full bg-store-cta text-store-cta-foreground hover:bg-store-cta/90 md:inline-flex"
            onClick={() => router.push("/checkout")}
          >
            Перейти к оформлению
          </Button>
        </CardContent>
      </Card>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
        aria-label="Итого по корзине"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">К оплате</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatPrice(cart.total_cents, currency)}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            disabled={isPending}
            className="min-h-11 shrink-0 bg-store-cta px-5 text-store-cta-foreground hover:bg-store-cta/90"
            onClick={() => router.push("/checkout")}
          >
            Оформить
          </Button>
        </div>
      </div>
    </div>
  );
}
