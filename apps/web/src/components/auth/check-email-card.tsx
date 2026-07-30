"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  resendVerificationAction,
  verifyEmailCodeAction,
  type AuthActionState,
} from "@/app/actions/auth";
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
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyEmailCodeAction,
    initialState,
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendVerificationAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Подтвердите email</CardTitle>
        <CardDescription>
          Мы отправили письмо с кодом подтверждения на{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={verifyAction} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={email} />
          <div className="flex flex-col gap-2">
            <label htmlFor="verification-code" className="text-sm font-medium">
              Код из письма
            </label>
            <input
              id="verification-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              pattern="\d{6}"
              placeholder="000000"
              className="h-11 rounded-lg border border-input bg-background px-3 text-center text-lg tracking-[0.3em] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {verifyState.error ? (
            <p className="text-sm text-destructive" role="alert">
              {verifyState.error}
            </p>
          ) : null}

          <Button type="submit" disabled={verifyPending} className="w-full">
            {verifyPending ? "Проверка..." : "Подтвердить email"}
          </Button>
        </form>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Также можно перейти по ссылке в письме — она откроет подтверждение
            автоматически.
          </p>
          <p className="text-xs text-muted-foreground">
            В режиме разработки код и ссылка выводятся в лог API-сервера.
          </p>

          <form action={resendAction} className="flex flex-col gap-3">
            <input type="hidden" name="email" value={email} />
            <Button type="submit" variant="outline" disabled={resendPending} className="w-full">
              {resendPending ? "Отправка..." : "Отправить письмо повторно"}
            </Button>
          </form>

          {resendState.error ? (
            <p className="text-sm text-destructive" role="alert">
              {resendState.error}
            </p>
          ) : null}
          {resendState.success ? (
            <p className="text-sm text-store-success" role="status">
              {resendState.success}
            </p>
          ) : null}
        </div>

        <Button className="w-full" render={<Link href="/login" />}>
          Перейти ко входу
        </Button>
      </CardContent>
    </Card>
  );
}
