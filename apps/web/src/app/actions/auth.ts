"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";
import { buildAuthCookieOptions } from "@/lib/auth/session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const CART_SESSION_COOKIE = "cart_session_id";

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

  const cookieStore = await cookies();
  const cartSession = cookieStore.get(CART_SESSION_COOKIE)?.value;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cartSession) {
    headers["X-Cart-Session-Id"] = cartSession;
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    return { error: "Неверный email или пароль." };
  }

  const data = (await res.json()) as { access_token: string };
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
