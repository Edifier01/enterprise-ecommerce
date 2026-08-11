import type { Metadata } from "next";

import { StoreInfoPage } from "@/components/store/layout/store-info-page";
import { infoPages } from "@/lib/store/info-pages";

export const metadata: Metadata = {
  title: "Оплата",
  description: infoPages.payment.description,
};

export default function PaymentPage() {
  return <StoreInfoPage page={infoPages.payment} />;
}
