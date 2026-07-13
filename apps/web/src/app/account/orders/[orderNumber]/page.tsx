import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountOrderDetailPage } from "@/components/store/account/account-order-detail-page";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Заказ",
  description: "Детали заказа",
};

type OrderDetailPageProps = {
  params: Promise<{ orderNumber: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?from=/account/orders");
  }

  const { orderNumber } = await params;
  return <AccountOrderDetailPage orderNumber={orderNumber} />;
}
