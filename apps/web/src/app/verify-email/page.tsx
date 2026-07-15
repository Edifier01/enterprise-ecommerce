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

async function verifyEmailToken(token: string): Promise<boolean> {
  const res = await fetch(`${getApiBase()}/api/v1/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    cache: "no-store",
  });
  return res.ok;
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
          <CardContent>
            <Button className="w-full" render={<Link href="/login" />}>
              Перейти ко входу
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const verified = await verifyEmailToken(token);

  return (
    <PageContainer
      as="main"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {verified ? "Email подтверждён" : "Ошибка подтверждения"}
          </CardTitle>
          <CardDescription>
            {verified
              ? "Аккаунт активирован. Теперь вы можете войти."
              : "Ссылка недействительна или устарела. Запросите новое письмо при регистрации."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {verified ? (
            <Button className="w-full" render={<Link href="/login" />}>
              Войти
            </Button>
          ) : (
            <>
              <Button className="w-full" render={<Link href="/register" />}>
                Зарегистрироваться снова
              </Button>
              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/login" />}
              >
                Перейти ко входу
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
