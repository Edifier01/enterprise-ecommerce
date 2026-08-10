"use client";

import Link from "next/link";
import { useActionState } from "react";

import { resetPasswordAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authInputClassName, authLinkClassName } from "@/lib/auth/form-styles";

const initialState: AuthActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Новый пароль</CardTitle>
        <CardDescription>Введите новый пароль для вашего аккаунта.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">
              Новый пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              className={authInputClassName}
            />
            <p className="text-xs text-muted-foreground">Минимум 8 символов.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password_confirm" className="text-sm font-medium">
              Повторите пароль
            </label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              className={authInputClassName}
            />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="min-h-11 w-full">
            {pending ? "Сохранение..." : "Сохранить пароль"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/forgot-password" className={authLinkClassName}>
            Запросить новую ссылку
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
