"use client";

import { useActionState } from "react";

import { adminLoginAction, type AdminAuthActionState } from "@/app/actions/admin-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminInputClass } from "@/lib/admin/form-styles";

const initialState: AdminAuthActionState = {};

type AdminLoginFormProps = {
  redirectTo?: string;
};

export function AdminLoginForm({ redirectTo = "/admin" }: AdminLoginFormProps) {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Вход в админ-панель</CardTitle>
        <CardDescription>
          Доступ только для сотрудников магазина.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="redirect_to" value={redirectTo} />

          <div className="flex flex-col gap-2">
            <label htmlFor="admin-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className={adminInputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="admin-password" className="text-sm font-medium">
              Пароль
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              className={adminInputClass}
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
      </CardContent>
    </Card>
  );
}
