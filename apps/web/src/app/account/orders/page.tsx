import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountOrdersPage } from "@/components/store/account/account-orders-page";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Мои заказы",
  description: "История заказов",
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?from=/account/orders");
  }

  return <AccountOrdersPage />;
}
