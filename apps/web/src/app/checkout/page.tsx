import type { Metadata } from "next";

import { CheckoutPaymentClient } from "@/components/store/checkout/checkout-payment-client";
import { PageContainer } from "@/components/store/layout/page-container";

export const metadata: Metadata = {
  title: "Оформление заказа",
  description: "Безопасная оплата заказа через Stripe",
};

export default function CheckoutPage() {
  return (
    <PageContainer as="div" className="space-y-6">
      <header className="space-y-2">
        <h1 className="store-section-title">Оформление заказа</h1>
        <p className="text-sm text-muted-foreground">
          Оплата проходит через Stripe Payment Element. Магазин не получает и не
          хранит данные карты.
        </p>
      </header>

      <CheckoutPaymentClient />
    </PageContainer>
  );
}
