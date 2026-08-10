"use client";

import Link from "next/link";
import { useActionState } from "react";

import { forgotPasswordAction, type AuthActionState } from "@/app/actions/auth";
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

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Восстановление пароля</CardTitle>
        <CardDescription>
          Укажите email — мы отправим ссылку для сброса пароля.
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

          <Button type="submit" disabled={pending} className="min-h-11 w-full">
            {pending ? "Отправка..." : "Отправить ссылку"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/login" className={authLinkClassName}>
            Вернуться ко входу
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
