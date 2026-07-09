"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteCartLine,
  getCheckoutErrorMessage,
  getCart,
  type Cart,
  updateCartLine,
} from "@/lib/checkout/api";
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
      } catch (err) {
        setError(getCheckoutErrorMessage(err, "Не удалось обновить корзину"));
      }
    });
  }

  if (!cart) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Загружаем корзину...
        </CardContent>
      </Card>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/20 px-6 py-16 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <ShoppingCart className="size-8 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Корзина пуста</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Добавьте товары из каталога, чтобы перейти к оформлению заказа.
        </p>
        <Button
          size="lg"
          className="mt-6 bg-store-cta text-store-cta-foreground hover:bg-store-cta/90"
          render={<Link href="/catalog" />}
        >
          Перейти в каталог
        </Button>
      </div>
    );
  }

  const currency = cart.currency ?? cart.lines[0]?.currency ?? "USD";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-3">
        {cart.lines.map((line) => {
          const name =
            line.product_snapshot.product_name ?? line.product_snapshot.sku ?? "Товар";
          const variant = line.product_snapshot.name ?? line.product_snapshot.variant_name;
          return (
            <Card key={line.id}>
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h2 className="font-medium text-foreground">{name}</h2>
                  {variant ? (
                    <p className="text-sm text-muted-foreground">Вариант: {variant}</p>
                  ) : null}
                  {line.product_snapshot.sku ? (
                    <p className="text-xs text-muted-foreground">
                      SKU: {line.product_snapshot.sku}
                    </p>
                  ) : null}
                  <p className="text-sm font-semibold">
                    {formatPrice(line.unit_price_cents, line.currency)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex items-center rounded-lg border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
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
                    disabled={isPending}
                    onClick={() => mutateCart(() => deleteCartLine(line.id))}
                    aria-label="Удалить товар"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
            className="w-full bg-store-cta text-store-cta-foreground hover:bg-store-cta/90"
            onClick={() => router.push("/checkout")}
          >
            Перейти к оформлению
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
