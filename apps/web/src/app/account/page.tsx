import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/store/layout/page-container";
import { getCurrentUser } from "@/lib/auth/session";
import { siteConfig } from "@/lib/store/site-config";

export const metadata: Metadata = {
  title: "Профиль",
  description: "Личный кабинет",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?from=/account");
  }

  return (
    <PageContainer as="main" className="space-y-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </p>
          {user.is_wholesaler ? (
            <p>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Оптовик
              </span>
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">Дата регистрации:</span>{" "}
            {new Date(user.created_at).toLocaleDateString(siteConfig.locale)}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-fit"
            render={<Link href="/account/orders" />}
          >
            Мои заказы
          </Button>
          <Link
            href="/catalog"
            className="text-primary underline-offset-4 hover:underline"
          >
            Вернуться в каталог
          </Link>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
