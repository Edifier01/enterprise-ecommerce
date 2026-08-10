"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerAction, type AuthActionState } from "@/app/actions/auth";
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

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>
          Создайте аккаунт для доступа к профилю и заказам.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              className={authInputClassName}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">
              Пароль
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

          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="min-h-11 w-full">
            {pending ? "Регистрация..." : "Зарегистрироваться"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className={authLinkClassName}>
            Войти
          </Link>
        </p>

        <Button
          variant="outline"
          className="mt-4 min-h-11 w-full"
          render={<Link href="/register/wholesale" />}
        >
          Зарегистрироваться как оптовик
        </Button>
      </CardContent>
    </Card>
  );
}
