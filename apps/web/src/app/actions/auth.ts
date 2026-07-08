"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";
import { buildAuthCookieOptions } from "@/lib/auth/session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AuthActionState = {
  error?: string;
};

export async function loginAction(
  _prev: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Некорректные данные формы." };
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    return { error: "Неверный email или пароль." };
  }

  const data = (await res.json()) as { access_token: string };
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, data.access_token, buildAuthCookieOptions());
  redirect("/");
}

export async function registerAction(
  _prev: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Некорректные данные формы." };
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (res.status === 409) {
    return { error: "Этот email уже зарегистрирован." };
  }

  if (res.status === 422) {
    return { error: "Проверьте email и пароль (минимум 8 символов)." };
  }

  if (!res.ok) {
    return { error: "Не удалось зарегистрироваться. Попробуйте снова." };
  }

  redirect("/login");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  redirect("/");
}
