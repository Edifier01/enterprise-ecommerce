import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { PageContainer } from "@/components/store/layout/page-container";

export const metadata: Metadata = {
  title: "Регистрация",
  description: "Создание аккаунта",
};

export default function RegisterPage() {
  return (
    <PageContainer
      as="main"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <RegisterForm />
    </PageContainer>
  );
}
