"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_ACCESS_TOKEN_COOKIE } from "@/lib/admin/constants";
import { sanitizeAdminRedirect } from "@/lib/admin/redirect";
import { buildAdminAuthCookieOptions } from "@/lib/admin/session";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type AdminAuthActionState = {
  error?: string;
};

export async function adminLoginAction(
  _prev: AdminAuthActionState | null,
  formData: FormData,
): Promise<AdminAuthActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Некорректные данные формы." };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      return {
        error: "Слишком много попыток входа. Подождите и попробуйте снова.",
      };
    }
    if (res.status === 403) {
      return { error: "Вход с этого адреса запрещён." };
    }
    if (res.status === 401) {
      return { error: "Неверный email или пароль." };
    }
    if (res.status >= 500) {
      return { error: "Сервер временно недоступен. Попробуйте позже." };
    }
    return { error: "Не удалось выполнить вход." };
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    return { error: "Не удалось выполнить вход." };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_ACCESS_TOKEN_COOKIE,
    data.access_token,
    buildAdminAuthCookieOptions(),
  );

  const redirectTo = formData.get("redirect_to");
  redirect(
    sanitizeAdminRedirect(typeof redirectTo === "string" ? redirectTo : undefined),
  );
}

export async function adminLogoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: ADMIN_ACCESS_TOKEN_COOKIE, path: "/admin" });
  redirect("/admin/login");
}
