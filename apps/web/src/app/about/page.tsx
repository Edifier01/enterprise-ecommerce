import type { Metadata } from "next";

import { StoreInfoPage } from "@/components/store/layout/store-info-page";
import { infoPages } from "@/lib/store/info-pages";

export const metadata: Metadata = {
  title: "О магазине",
  description: infoPages.about.description,
};

export default function AboutPage() {
  return <StoreInfoPage page={infoPages.about} />;
}
