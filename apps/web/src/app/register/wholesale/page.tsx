import type { Metadata } from "next";

import { WholesaleRegisterForm } from "@/components/auth/wholesale-register-form";
import { PageContainer } from "@/components/store/layout/page-container";
import { siteConfig } from "@/lib/store/site-config";

export const metadata: Metadata = {
  title: "Регистрация оптовика",
  description: `Регистрация оптового покупателя в ${siteConfig.name}`,
};

export default function WholesaleRegisterPage() {
  return (
    <PageContainer
      as="main"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <WholesaleRegisterForm />
    </PageContainer>
  );
}
