"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StripePaymentForm } from "@/components/store/checkout/checkout-stripe-payment-form";
import {
  CheckoutShippingForm,
  readCheckoutShippingFromForm,
} from "@/components/store/checkout/checkout-shipping-form";
import {
  createCheckoutSession,
  createPaymentIntent,
  getCheckoutErrorMessage,
  getCart,
  simulateStubPaymentSuccess,
  type Cart,
} from "@/lib/checkout/api";
import { formatPrice } from "@/lib/store/format";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const paymentMode = process.env.NEXT_PUBLIC_PAYMENT_MODE ?? "auto";

function resolvePaymentMode(): "stub" | "stripe" {
  if (paymentMode === "stub") return "stub";
  if (paymentMode === "stripe") return "stripe";
  return publishableKey ? "stripe" : "stub";
}

type PaymentState = {
  sessionId: string;
  clientSecret: string;
  paymentIntentId: string;
};

export function CheckoutPaymentClient() {
  const resolvedMode = resolvePaymentMode();
  const [cart, setCart] = useState<Cart | null>(null);
  const [payment, setPayment] = useState<PaymentState | null>(null);
  const shippingFormId = "checkout-shipping-form";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [stripeModule, setStripeModule] = useState<{
    loadStripe: typeof import("@stripe/stripe-js").loadStripe;
  } | null>(null);
  const router = useRouter();

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

  useEffect(() => {
    if (resolvedMode !== "stripe" || !publishableKey) return;
    let mounted = true;
    import("@stripe/stripe-js").then((mod) => {
      if (mounted) setStripeModule({ loadStripe: mod.loadStripe });
    });
    return () => {
      mounted = false;
    };
  }, [resolvedMode]);

  const stripePromise = useMemo(() => {
    if (resolvedMode !== "stripe" || !publishableKey || !stripeModule) return null;
    return stripeModule.loadStripe(publishableKey);
  }, [resolvedMode, stripeModule]);

  const currency = cart?.currency ?? cart?.lines[0]?.currency ?? "USD";

  function preparePayment(form: HTMLFormElement) {
    setError(null);
    startTransition(async () => {
      try {
        const shipping = readCheckoutShippingFromForm(form);
        const session = await createCheckoutSession(shipping);
        const intent = await createPaymentIntent(session.id);
        setPayment({
          sessionId: session.id,
          clientSecret: intent.client_secret,
          paymentIntentId: intent.payment_intent_id,
        });
      } catch (err) {
        setError(getCheckoutErrorMessage(err, "Не удалось начать оплату"));
      }
    });
  }

  function completeStubPayment() {
    if (!payment) return;
    setError(null);
    startTransition(async () => {
      try {
        await simulateStubPaymentSuccess(payment.paymentIntentId);
        router.push(`/checkout/confirmation?session_id=${payment.sessionId}`);
      } catch (err) {
        setError(getCheckoutErrorMessage(err, "Не удалось выполнить тестовую оплату"));
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
      {resolvedMode === "stub" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 lg:col-span-2">
          Тестовый режим оплаты: реальный платёжный провайдер не используется.
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Доставка</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id={shippingFormId}
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              preparePayment(event.currentTarget);
            }}
          >
            <CheckoutShippingForm disabled={Boolean(payment) || isPending} />
            {!payment ? (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {resolvedMode === "stripe"
                    ? "После проверки адреса откроется защищённая Stripe Payment Element форма."
                    : "После проверки адреса откроется тестовая форма оплаты."}
                </p>
                {resolvedMode === "stripe" && !publishableKey ? (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                    Не задан `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Оплата недоступна.
                  </p>
                ) : null}
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    isPending || (resolvedMode === "stripe" && !publishableKey)
                  }
                  className="bg-store-cta text-store-cta-foreground hover:bg-store-cta/90"
                >
                  {isPending ? "Готовим оплату..." : "Перейти к оплате"}
                </Button>
              </div>
            ) : null}
          </form>

          {payment && resolvedMode === "stripe" && stripePromise && elementsOptions ? (
            <div className="mt-6 border-t pt-6">
              <StripePaymentForm
                sessionId={payment.sessionId}
                stripePromise={stripePromise}
                elementsOptions={elementsOptions}
              />
            </div>
          ) : payment && resolvedMode === "stub" ? (
            <div className="mt-6 space-y-4 border-t pt-6">
              <p className="text-sm text-muted-foreground">
                Нажмите кнопку ниже, чтобы симулировать успешную оплату и создать заказ.
              </p>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                type="button"
                size="lg"
                disabled={isPending}
                className="bg-store-cta text-store-cta-foreground hover:bg-store-cta/90"
                onClick={completeStubPayment}
              >
                {isPending ? "Подтверждаем..." : "Оплатить (тест)"}
              </Button>
            </div>
          ) : null}
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
