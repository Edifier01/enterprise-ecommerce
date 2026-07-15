import type { Metadata } from "next";
import Link from "next/link";

import { CheckEmailCard } from "@/components/auth/check-email-card";
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
  description: "Проверьте почту для завершения регистрации",
};

type CheckEmailPageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const { email } = await searchParams;

  return (
    <PageContainer
      as="main"
      className="flex min-h-[50vh] items-center justify-center"
    >
      {email ? (
        <CheckEmailCard email={email} />
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Подтверждение email</CardTitle>
            <CardDescription>Email не указан.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" render={<Link href="/register" />}>
              Вернуться к регистрации
            </Button>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
