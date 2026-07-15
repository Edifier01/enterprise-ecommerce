import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PageContainer } from "@/components/store/layout/page-container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Сброс пароля",
  description: "Установка нового пароля",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <PageContainer
      as="main"
      className="flex min-h-[50vh] items-center justify-center"
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Сброс пароля</CardTitle>
            <CardDescription>Ссылка недействительна — токен не найден.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" render={<Link href="/forgot-password" />}>
              Запросить сброс пароля
            </Button>
            <Button variant="outline" className="w-full" render={<Link href="/login" />}>
              Перейти ко входу
            </Button>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
