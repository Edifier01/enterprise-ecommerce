import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { PageContainer } from "@/components/store/layout/page-container";
import { isStorefrontAuthUiEnabled } from "@/lib/auth/storefront-auth";

export const metadata: Metadata = {
  title: "Регистрация",
  description: "Создание аккаунта",
};

export default function RegisterPage() {
  if (!isStorefrontAuthUiEnabled()) {
    redirect("/");
  }

  return (
    <PageContainer
      as="main"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <RegisterForm />
    </PageContainer>
  );
}
