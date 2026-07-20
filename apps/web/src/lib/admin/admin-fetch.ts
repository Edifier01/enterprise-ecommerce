import "server-only";

import { getAdminAccessToken } from "@/lib/admin/session";
import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type AdminFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export function adminFetchErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Сессия истекла. Войдите снова.";
    case 403:
      return "Недостаточно прав для просмотра.";
    case 404:
      return "Данные не найдены.";
    default:
      return status >= 500
        ? "Ошибка сервера. Попробуйте позже."
        : "Не удалось загрузить данные.";
  }
}

export async function adminFetchResult<T>(
  path: string,
  init?: RequestInit,
): Promise<AdminFetchResult<T>> {
  const token = await getAdminAccessToken();
  if (!token) {
    return { ok: false, error: "Требуется вход в админ-панель.", status: 401 };
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, error: adminFetchErrorMessage(res.status), status: res.status };
  }

  if (res.status === 204) {
    return { ok: true, data: undefined as T };
  }

  return { ok: true, data: (await res.json()) as T };
}

/** @deprecated Prefer adminFetchResult for typed error handling. */
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const result = await adminFetchResult<T>(path, init);
  return result.ok ? result.data : null;
}
