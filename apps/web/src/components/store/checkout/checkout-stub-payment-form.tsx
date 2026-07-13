"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { simulateStubPaymentSuccess } from "@/lib/checkout/api";

type StubPaymentFormProps = {
  sessionId: string;
  paymentIntentId: string;
};

export function StubPaymentForm({ sessionId, paymentIntentId }: StubPaymentFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCompletePayment() {
    setIsSubmitting(true);
    setError(null);

    try {
      await simulateStubPaymentSuccess(paymentIntentId);
      router.push(`/checkout/confirmation?session_id=${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Тестовый платёж не выполнен");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Режим тестовой оплаты: реальный платёжный провайдер не используется. Нажмите
        кнопку ниже, чтобы симулировать успешную оплату и создать заказ.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        size="lg"
        disabled={isSubmitting}
        className="bg-store-cta text-store-cta-foreground hover:bg-store-cta/90"
        onClick={handleCompletePayment}
      >
        {isSubmitting ? "Подтверждаем..." : "Оплатить (тест)"}
      </Button>
    </div>
  );
}
