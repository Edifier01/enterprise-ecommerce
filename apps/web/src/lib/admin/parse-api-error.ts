export type AdminApiError = {
  message: string;
  fieldErrors?: Record<string, string>;
};

export function parseAdminApiError(body: unknown): AdminApiError {
  if (!body || typeof body !== "object") {
    return { message: "Не удалось сохранить изменения." };
  }

  const detail = (body as { detail?: unknown }).detail;

  if (typeof detail === "string") {
    return { message: detail };
  }

  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {};

    for (const item of detail) {
      if (!item || typeof item !== "object" || !("msg" in item)) {
        continue;
      }

      const record = item as { loc?: unknown[]; msg: string };
      const field = record.loc?.[record.loc.length - 1];

      if (typeof field === "string") {
        fieldErrors[field] = record.msg;
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { message: "Исправьте ошибки в форме.", fieldErrors };
    }
  }

  return { message: "Не удалось сохранить изменения." };
}
