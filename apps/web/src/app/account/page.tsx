import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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
          <p>
            <span className="text-muted-foreground">Дата регистрации:</span>{" "}
            {new Date(user.created_at).toLocaleDateString(siteConfig.locale)}
          </p>
          <Link
            href="/catalog"
            className="mt-2 text-primary underline-offset-4 hover:underline"
          >
            Вернуться в каталог
          </Link>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
