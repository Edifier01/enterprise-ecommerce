import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PageContainer } from "@/components/store/layout/page-container";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  description: "Сброс пароля по email",
};

export default function ForgotPasswordPage() {
  return (
    <PageContainer
      as="main"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <ForgotPasswordForm />
    </PageContainer>
  );
}
