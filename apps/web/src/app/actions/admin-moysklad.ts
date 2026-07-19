"use server";

import { revalidatePath } from "next/cache";

import { parseAdminApiError } from "@/lib/admin/parse-api-error";
import { mutateMoySklad } from "@/lib/admin/integrations/moysklad";
import { getAdminAccessToken } from "@/lib/admin/session";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type IntegrationActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function pullMoySkladCatalogAction(): Promise<IntegrationActionState> {
  const result = await mutateMoySklad("/api/v1/admin/integrations/moysklad/sync/pull", "POST");
  if (!result.ok) {
    return { error: "Не удалось запустить импорт каталога." };
  }
  revalidatePath("/admin/integrations/moysklad");
  revalidatePath("/admin/catalog");
  return {
    success: true,
    message: "Импорт каталога и остатков из МойСклад завершён.",
  };
}

export async function pullMoySkladStockAction(): Promise<IntegrationActionState> {
  const result = await mutateMoySklad("/api/v1/admin/integrations/moysklad/sync/stock", "POST");
  if (!result.ok) {
    return { error: "Не удалось обновить остатки." };
  }
  revalidatePath("/admin/integrations/moysklad");
  return { success: true, message: "Остатки обновлены из МойСклад." };
}

export async function fullResyncMoySkladAction(): Promise<IntegrationActionState> {
  const result = await mutateMoySklad(
    "/api/v1/admin/integrations/moysklad/sync/resync",
    "POST",
  );
  if (!result.ok) {
    return { error: "Не удалось выполнить полную синхронизацию." };
  }
  revalidatePath("/admin/integrations/moysklad");
  revalidatePath("/admin/catalog");
  return {
    success: true,
    message: "Полная синхронизация завершена (каталог, остатки, экспорт заказов).",
  };
}

export async function setMoySkladWebhooksAction(enabled: boolean): Promise<IntegrationActionState> {
  const result = await mutateMoySklad(
    "/api/v1/admin/integrations/moysklad/webhooks/enabled",
    "PATCH",
    { enabled },
  );
  if (!result.ok) {
    return { error: "Не удалось изменить настройку вебхуков." };
  }
  revalidatePath("/admin/integrations/moysklad");
  return { success: true };
}

export async function createCategoryMappingAction(
  _prev: IntegrationActionState | null,
  formData: FormData,
): Promise<IntegrationActionState> {
  const categoryId = formData.get("category_id");
  const folderId = formData.get("moysklad_folder_id");

  if (typeof categoryId !== "string" || typeof folderId !== "string" || !folderId.trim()) {
    return { error: "Укажите категорию и UUID папки МойСклад." };
  }

  const result = await mutateMoySklad(
    "/api/v1/admin/integrations/moysklad/category-mappings",
    "POST",
    { category_id: categoryId, moysklad_folder_id: folderId.trim() },
  );

  if (!result.ok) {
    const token = await getAdminAccessToken();
    if (!token) {
      return { error: "Требуется вход в админ-панель." };
    }
    const res = await fetch(`${API_BASE}/api/v1/admin/integrations/moysklad/category-mappings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category_id: categoryId,
        moysklad_folder_id: folderId.trim(),
      }),
    });
    if (!res.ok) {
      const parsed = parseAdminApiError(await res.json().catch(() => null));
      return { error: parsed.message };
    }
  }

  revalidatePath("/admin/integrations/moysklad");
  return { success: true };
}

export async function deleteCategoryMappingAction(mappingId: string): Promise<IntegrationActionState> {
  const token = await getAdminAccessToken();
  if (!token) {
    return { error: "Требуется вход в админ-панель." };
  }

  const res = await fetch(
    `${API_BASE}/api/v1/admin/integrations/moysklad/category-mappings/${mappingId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    return { error: "Не удалось удалить сопоставление." };
  }

  revalidatePath("/admin/integrations/moysklad");
  return { success: true };
}
