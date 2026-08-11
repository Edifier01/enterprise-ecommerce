import type { Metadata } from "next";

import { StoreInfoPage } from "@/components/store/layout/store-info-page";
import { infoPages } from "@/lib/store/info-pages";

export const metadata: Metadata = {
  title: "Контакты",
  description: infoPages.contacts.description,
};

export default function ContactsPage() {
  return <StoreInfoPage page={infoPages.contacts} showContactDetails />;
}
