import type { Metadata } from "next";
import Link from "next/link";

import { getApiBase } from "@/lib/api-base";
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
  title: "Подтверждение email",
  description: "Подтверждение адреса электронной почты",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

type VerifyResult = "success" | "invalid" | "unavailable";

async function verifyEmailToken(token: string): Promise<VerifyResult> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (res.ok) {
      return "success";
    }
    if (res.status === 400) {
      return "invalid";
    }
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <PageContainer
        as="main"
        className="flex min-h-[50vh] items-center justify-center"
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Ошибка подтверждения</CardTitle>
            <CardDescription>Ссылка недействительна — токен не найден.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="min-h-11 w-full" render={<Link href="/login" />}>
              Перейти ко входу
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const result = await verifyEmailToken(token);

  if (result === "success") {
    return (
      <PageContainer
        as="main"
        className="flex min-h-[50vh] items-center justify-center"
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email подтверждён</CardTitle>
            <CardDescription>
              Аккаунт активирован. Теперь вы можете войти.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="min-h-11 w-full" render={<Link href="/login" />}>
              Войти
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const isUnavailable = result === "unavailable";

  return (
    <PageContainer
      as="main"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isUnavailable ? "Сервис временно недоступен" : "Ошибка подтверждения"}
          </CardTitle>
          <CardDescription>
            {isUnavailable
              ? "Не удалось подтвердить email. Попробуйте позже или запросите новое письмо."
              : "Ссылка недействительна или устарела. Запросите новое письмо на странице входа."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="min-h-11 w-full" render={<Link href="/login" />}>
            Перейти ко входу
          </Button>
          {!isUnavailable ? (
            <Button
              variant="outline"
              className="min-h-11 w-full"
              render={<Link href="/register" />}
            >
              Зарегистрироваться
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
