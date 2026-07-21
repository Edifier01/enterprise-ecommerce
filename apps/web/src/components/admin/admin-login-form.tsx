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
  const [loginState, loginAction, loginPending] = useActionState(
    adminLoginAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Вход в админ-панель</CardTitle>
        <CardDescription>Email и пароль администратора</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={loginAction} className="flex flex-col gap-4">
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
              minLength={8}
              className={adminInputClass}
            />
          </div>
          {loginState.error ? (
            <p className="text-sm text-destructive" role="alert">
              {loginState.error}
            </p>
          ) : null}
          <Button type="submit" disabled={loginPending} className="w-full">
            {loginPending ? "Вход..." : "Войти"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
