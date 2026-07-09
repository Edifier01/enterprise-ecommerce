"use client";

import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCheckoutSession, type CheckoutSession } from "@/lib/checkout/api";
import { formatPrice } from "@/lib/store/format";

export function ConfirmationClient({ sessionId }: { sessionId?: string }) {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const resolvedSessionId = sessionId;

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      try {
        const nextSession = await getCheckoutSession(resolvedSessionId);
        if (cancelled) return;
        setSession(nextSession);
        if (!nextSession.order_number && attempts < 8) {
          attempts += 1;
          window.setTimeout(poll, 1500);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось получить заказ");
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Не найден checkout session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Вернитесь в корзину и повторите оформление заказа.</p>
          <Button render={<Link href="/cart" />}>Открыть корзину</Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Не удалось проверить заказ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button render={<Link href="/cart" />}>Вернуться в корзину</Button>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Проверяем статус оплаты...
        </CardContent>
      </Card>
    );
  }

  const isConfirmed = Boolean(session.order_number);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {isConfirmed ? (
            <CheckCircle2 className="size-6 text-store-success" aria-hidden />
          ) : (
            <Clock className="size-6 text-muted-foreground" aria-hidden />
          )}
          <CardTitle>
            {isConfirmed ? "Заказ подтверждён" : "Ожидаем подтверждение оплаты"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConfirmed ? (
          <p className="text-sm text-muted-foreground">
            Номер заказа: <span className="font-semibold text-foreground">{session.order_number}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Stripe уже вернул вас в магазин. Заказ появится после обработки
            защищённого webhook-события.
          </p>
        )}

        <div className="rounded-lg border bg-muted/20 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Статус</span>
            <span className="font-medium">{session.status}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">Сумма</span>
            <span className="font-medium">
              {formatPrice(session.total_cents, session.currency)}
            </span>
          </div>
        </div>

        <Button render={<Link href="/catalog" />}>Вернуться в каталог</Button>
      </CardContent>
    </Card>
  );
}
