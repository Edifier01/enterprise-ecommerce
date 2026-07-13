"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerWholesaleAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const inputClassName =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const initialState: AuthActionState = {};

export function WholesaleRegisterForm() {
  const [state, formAction, pending] = useActionState(registerWholesaleAction, initialState);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Регистрация оптовика</CardTitle>
        <CardDescription>
          Заполните все поля для создания оптового аккаунта с доступом к оптовым ценам.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="full_name" className="text-sm font-medium">
              ФИО
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              required
              maxLength={255}
              className={inputClassName}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="edo_provider" className="text-sm font-medium">
                ЭДО
              </label>
              <input
                id="edo_provider"
                name="edo_provider"
                type="text"
                required
                maxLength={255}
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="edo_id" className="text-sm font-medium">
                ЭДО ID
              </label>
              <input
                id="edo_id"
                name="edo_id"
                type="text"
                required
                maxLength={255}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Номер телефона
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={32}
              className={inputClassName}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="inn" className="text-sm font-medium">
                ИНН
              </label>
              <input
                id="inn"
                name="inn"
                type="text"
                inputMode="numeric"
                pattern="\d{12}"
                title="ИНН должен содержать 12 цифр"
                required
                minLength={12}
                maxLength={12}
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="ogrnip" className="text-sm font-medium">
                ОГРНИП
              </label>
              <input
                id="ogrnip"
                name="ogrnip"
                type="text"
                inputMode="numeric"
                pattern="\d{15}"
                title="ОГРНИП должен содержать 15 цифр"
                required
                minLength={15}
                maxLength={15}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="legal_address" className="text-sm font-medium">
              Юридический адрес
            </label>
            <input
              id="legal_address"
              name="legal_address"
              type="text"
              autoComplete="street-address"
              required
              maxLength={500}
              className={inputClassName}
            />
          </div>

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
              className={inputClassName}
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
              className={inputClassName}
            />
            <p className="text-xs text-muted-foreground">Минимум 8 символов.</p>
          </div>

          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Регистрация..." : "Зарегистрироваться как оптовик"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Войти
          </Link>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Розничный покупатель?{" "}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline">
            Обычная регистрация
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
