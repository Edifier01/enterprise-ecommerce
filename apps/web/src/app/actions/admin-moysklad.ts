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
  revalidatePath("/admin/integrations/moysklad/import");
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
  revalidatePath("/admin/integrations/moysklad/import");
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

async function patchProduct(
  productId: string,
  body: Record<string, unknown>,
): Promise<IntegrationActionState> {
  const token = await getAdminAccessToken();
  if (!token) {
    return { error: "Требуется вход в админ-панель." };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/catalog/products/${productId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const parsed = parseAdminApiError(await res.json().catch(() => null));
    return { error: parsed.message };
  }

  revalidatePath("/admin/catalog");
  revalidatePath("/admin/integrations/moysklad");
  revalidatePath("/admin/integrations/moysklad/import");
  revalidatePath("/");
  revalidatePath("/catalog");
  return { success: true };
}

export async function assignMoySkladProductCategoryAction(
  productId: string,
  categoryId: string,
): Promise<IntegrationActionState> {
  if (!categoryId) {
    return { error: "Выберите категорию." };
  }

  const result = await patchProduct(productId, { category_id: categoryId });
  if (result.error) {
    return result;
  }

  return {
    success: true,
    message: "Категория назначена. Добавьте фото и опубликуйте товар на странице редактирования.",
  };
}

export async function hideProductAction(productId: string): Promise<IntegrationActionState> {
  const result = await patchProduct(productId, { status: "archived" });
  if (result.error) {
    return result;
  }

  return { success: true, message: "Товар скрыт с витрины." };
}
