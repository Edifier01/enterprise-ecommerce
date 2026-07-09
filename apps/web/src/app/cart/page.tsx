import type { Metadata } from "next";

import { CartClient } from "@/components/store/checkout/cart-client";
import { PageContainer } from "@/components/store/layout/page-container";

export const metadata: Metadata = {
  title: "Корзина",
  description: "Корзина покупок",
};

export default function CartPage() {
  return (
    <PageContainer as="div" className="space-y-6">
      <header className="space-y-2">
        <h1 className="store-section-title">Корзина</h1>
        <p className="text-sm text-muted-foreground">
          Проверьте товары перед переходом к оплате.
        </p>
      </header>

      <CartClient />
    </PageContainer>
  );
}
