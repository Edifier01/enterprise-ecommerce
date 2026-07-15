"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { loginAction, resendVerificationAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthActionState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [resendState, resendAction, resendPending] = useActionState(
    resendVerificationAction,
    initialState,
  );

  const showResend = state.error?.includes("Подтвердите email") ?? false;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Вход</CardTitle>
        <CardDescription>
          Войдите в аккаунт для доступа к личному кабинету.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {resetSuccess ? (
          <p className="text-sm text-store-success" role="status">
            Пароль успешно изменён. Войдите с новым паролем.
          </p>
        ) : null}

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Пароль
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                Забыли пароль?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Вход..." : "Войти"}
          </Button>
        </form>

        {showResend ? (
          <form action={resendAction} className="flex flex-col gap-2 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Не получили письмо? Укажите email и запросите повторную отправку.
            </p>
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="submit" variant="outline" disabled={resendPending}>
              {resendPending ? "Отправка..." : "Отправить письмо повторно"}
            </Button>
            {resendState.success ? (
              <p className="text-xs text-store-success" role="status">
                {resendState.success}
              </p>
            ) : null}
            {resendState.error ? (
              <p className="text-xs text-destructive" role="alert">
                {resendState.error}
              </p>
            ) : null}
          </form>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
