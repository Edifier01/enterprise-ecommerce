import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { PageContainer } from "@/components/store/layout/page-container";
import { isStorefrontAuthUiEnabled } from "@/lib/auth/storefront-auth";

export const metadata: Metadata = {
  title: "Вход",
  description: "Вход в личный кабинет",
};

export default function LoginPage() {
  return (
    <PageContainer
      as="main"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <Suspense>
        <LoginForm showRegisterLink={isStorefrontAuthUiEnabled()} />
      </Suspense>
    </PageContainer>
  );
}
