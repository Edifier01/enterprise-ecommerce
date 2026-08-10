import type { Metadata } from "next";

import { WholesaleRegisterForm } from "@/components/auth/wholesale-register-form";
import { PageContainer } from "@/components/store/layout/page-container";
import { isStorefrontAuthUiEnabled } from "@/lib/auth/storefront-auth";
import { siteConfig } from "@/lib/store/site-config";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Регистрация оптовика",
  description: `Регистрация оптового покупателя в ${siteConfig.name}`,
};

export default function WholesaleRegisterPage() {
  if (!isStorefrontAuthUiEnabled()) {
    redirect("/");
  }

  return (
    <PageContainer
      as="main"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <WholesaleRegisterForm />
    </PageContainer>
  );
}
