"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createCheckoutSession,
  createPaymentIntent,
  getCheckoutErrorMessage,
  getCart,
  type Cart,
} from "@/lib/checkout/api";
import { formatPrice } from "@/lib/store/format";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type PaymentState = {
  sessionId: string;
  clientSecret: string;
};

export function CheckoutPaymentClient() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [payment, setPayment] = useState<PaymentState | null>(null);
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

  const currency = cart?.currency ?? cart?.lines[0]?.currency ?? "USD";

  function preparePayment() {
    setError(null);
    startTransition(async () => {
      try {
        const session = await createCheckoutSession();
        const intent = await createPaymentIntent(session.id);
        setPayment({ sessionId: session.id, clientSecret: intent.client_secret });
      } catch (err) {
        setError(getCheckoutErrorMessage(err, "Не удалось начать оплату"));
      }
    });
  }

  const elementsOptions = useMemo(
    () =>
      payment
        ? {
            clientSecret: payment.clientSecret,
            appearance: { theme: "stripe" as const },
          }
        : null,
    [payment]
  );

  if (!cart) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Загружаем оформление заказа...
        </CardContent>
      </Card>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Корзина пуста</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Добавьте товары перед оформлением заказа.</p>
          <Button render={<Link href="/catalog" />}>Перейти в каталог</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>Оплата</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!publishableKey ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              Не задан `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Оплата недоступна.
            </p>
          ) : null}

          {payment && stripePromise && elementsOptions ? (
            <Elements stripe={stripePromise} options={elementsOptions}>
              <PaymentForm sessionId={payment.sessionId} />
            </Elements>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                На следующем шаге откроется защищённая Stripe Payment Element форма.
                Данные карты не проходят через сервер магазина.
              </p>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                type="button"
                size="lg"
                disabled={!publishableKey || isPending}
                className="bg-store-cta text-store-cta-foreground hover:bg-store-cta/90"
                onClick={preparePayment}
              >
                {isPending ? "Готовим оплату..." : "Перейти к оплате"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Ваш заказ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {cart.lines.map((line) => (
              <div key={line.id} className="flex justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">
                    {line.product_snapshot.product_name ?? line.product_snapshot.sku ?? "Товар"}
                  </p>
                  <p className="text-muted-foreground">× {line.quantity}</p>
                </div>
                <p className="font-medium">
                  {formatPrice(line.line_total_cents, line.currency)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t pt-4 font-semibold">
            <span>Итого</span>
            <span>{formatPrice(cart.total_cents, currency)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentForm({ sessionId }: { sessionId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    const returnUrl = `${window.location.origin}/checkout/confirmation?session_id=${sessionId}`;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Платёж не выполнен");
      setIsSubmitting(false);
      return;
    }

    router.push(`/checkout/confirmation?session_id=${sessionId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="submit"
        size="lg"
        disabled={!stripe || !elements || isSubmitting}
        className="bg-store-cta text-store-cta-foreground hover:bg-store-cta/90"
      >
        {isSubmitting ? "Подтверждаем..." : "Оплатить"}
      </Button>
    </form>
  );
}
