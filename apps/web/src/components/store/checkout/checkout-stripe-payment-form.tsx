"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type StripePaymentFormProps = {
  sessionId: string;
  stripePromise: Promise<Stripe | null>;
  elementsOptions: StripeElementsOptions;
};

export function StripePaymentForm({
  sessionId,
  stripePromise,
  elementsOptions,
}: StripePaymentFormProps) {
  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <PaymentForm sessionId={sessionId} />
    </Elements>
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
