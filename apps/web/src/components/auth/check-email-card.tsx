"use client";

import Link from "next/link";
import { useActionState } from "react";

import { resendVerificationAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthActionState = {};

export function CheckEmailCard({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(
    resendVerificationAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Проверьте почту</CardTitle>
        <CardDescription>
          Мы отправили письмо с ссылкой для подтверждения на{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Перейдите по ссылке в письме, чтобы завершить регистрацию. После
          подтверждения вы сможете войти в аккаунт.
        </p>
        <p className="text-sm text-muted-foreground">
          В режиме разработки ссылка также выводится в лог API-сервера.
        </p>

        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={email} />
          <Button type="submit" variant="outline" disabled={pending} className="w-full">
            {pending ? "Отправка..." : "Отправить письмо повторно"}
          </Button>
        </form>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-store-success" role="status">
            {state.success}
          </p>
        ) : null}

        <Button className="w-full" render={<Link href="/login" />}>
          Перейти ко входу
        </Button>
      </CardContent>
    </Card>
  );
}
