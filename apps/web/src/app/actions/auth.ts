"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";
import { buildAuthCookieOptions } from "@/lib/auth/session";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();
const CART_SESSION_COOKIE = "cart_session_id";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function readRequiredString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

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

  if (res.status === 403) {
    return {
      error:
        "Подтвердите email перед входом. Проверьте почту или запросите повторную отправку.",
    };
  }

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
  const firstName = readRequiredString(formData, "first_name");
  const lastName = readRequiredString(formData, "last_name");
  const email = readRequiredString(formData, "email");
  const password = formData.get("password");

  if (!firstName || !lastName || !email || typeof password !== "string") {
    return { error: "Заполните все обязательные поля." };
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    }),
  });

  if (res.status === 409) {
    return { error: "Этот email уже зарегистрирован." };
  }

  if (res.status === 422) {
    return { error: "Проверьте данные формы и пароль (минимум 8 символов)." };
  }

  if (!res.ok) {
    return { error: "Не удалось зарегистрироваться. Попробуйте снова." };
  }

  redirect(`/register/check-email?email=${encodeURIComponent(email)}`);
}

export async function registerWholesaleAction(
  _prev: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const payload = {
    full_name: readRequiredString(formData, "full_name"),
    edo_provider: readRequiredString(formData, "edo_provider"),
    edo_id: readRequiredString(formData, "edo_id"),
    phone: readRequiredString(formData, "phone"),
    inn: readRequiredString(formData, "inn"),
    ogrnip: readRequiredString(formData, "ogrnip"),
    legal_address: readRequiredString(formData, "legal_address"),
    email: readRequiredString(formData, "email"),
    password: formData.get("password"),
  };

  if (
    !payload.full_name ||
    !payload.edo_provider ||
    !payload.edo_id ||
    !payload.phone ||
    !payload.inn ||
    !payload.ogrnip ||
    !payload.legal_address ||
    !payload.email ||
    typeof payload.password !== "string"
  ) {
    return { error: "Заполните все обязательные поля." };
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/register/wholesaler`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 409) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    if (body?.detail === "INN already registered") {
      return { error: "Этот ИНН уже зарегистрирован." };
    }
    return { error: "Этот email уже зарегистрирован." };
  }

  if (res.status === 422) {
    return {
      error:
        "Проверьте данные: ИНН — 12 цифр, ОГРНИП — 15 цифр, пароль — минимум 8 символов.",
    };
  }

  if (!res.ok) {
    return { error: "Не удалось зарегистрироваться. Попробуйте снова." };
  }

  redirect(`/register/check-email?email=${encodeURIComponent(payload.email)}`);
}

export async function forgotPasswordAction(
  _prev: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readRequiredString(formData, "email");
  if (!email) {
    return { error: "Укажите email." };
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    return { error: "Не удалось отправить запрос. Попробуйте снова." };
  }

  return {
    success:
      "Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.",
  };
}

export async function resetPasswordAction(
  _prev: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const token = readRequiredString(formData, "token");
  const password = formData.get("password");

  if (!token || typeof password !== "string") {
    return { error: "Некорректные данные формы." };
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  if (res.status === 400) {
    return { error: "Ссылка недействительна или устарела. Запросите сброс пароля снова." };
  }

  if (res.status === 422) {
    return { error: "Пароль должен содержать минимум 8 символов." };
  }

  if (!res.ok) {
    return { error: "Не удалось сменить пароль. Попробуйте снова." };
  }

  redirect("/login?reset=success");
}

export async function resendVerificationAction(
  _prev: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readRequiredString(formData, "email");
  if (!email) {
    return { error: "Укажите email." };
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    return { error: "Не удалось отправить письмо. Попробуйте снова." };
  }

  return {
    success:
      "Если аккаунт существует и email не подтверждён, мы отправили новое письмо.",
  };
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  redirect("/");
}
