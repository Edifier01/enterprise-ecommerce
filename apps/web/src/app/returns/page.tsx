import type { Metadata } from "next";

import { StoreInfoPage } from "@/components/store/layout/store-info-page";
import { infoPages } from "@/lib/store/info-pages";

export const metadata: Metadata = {
  title: "Возврат",
  description: infoPages.returns.description,
};

export default function ReturnsPage() {
  return <StoreInfoPage page={infoPages.returns} />;
}
