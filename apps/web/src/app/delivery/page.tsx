import type { Metadata } from "next";

import { StoreInfoPage } from "@/components/store/layout/store-info-page";
import { infoPages } from "@/lib/store/info-pages";

export const metadata: Metadata = {
  title: "Доставка",
  description: infoPages.delivery.description,
};

export default function DeliveryPage() {
  return <StoreInfoPage page={infoPages.delivery} />;
}
