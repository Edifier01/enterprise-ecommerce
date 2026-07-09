import type { Metadata } from "next";

import { ConfirmationClient } from "@/components/store/checkout/confirmation-client";
import { PageContainer } from "@/components/store/layout/page-container";

export const metadata: Metadata = {
  title: "Подтверждение заказа",
  description: "Статус оплаты и подтверждение заказа",
};

interface ConfirmationPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { session_id: sessionId } = await searchParams;

  return (
    <PageContainer as="div" className="space-y-6">
      <header className="space-y-2">
        <h1 className="store-section-title">Подтверждение заказа</h1>
      </header>

      <ConfirmationClient sessionId={sessionId} />
    </PageContainer>
  );
}
