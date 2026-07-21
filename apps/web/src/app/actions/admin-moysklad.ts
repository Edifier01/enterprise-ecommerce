"use server";

import { revalidatePath } from "next/cache";

import { parseAdminApiError } from "@/lib/admin/parse-api-error";
import { mutateMoySklad } from "@/lib/admin/integrations/moysklad";
import type { AdminProduct } from "@/lib/admin/catalog-shared";
import {
  getPublishBlockers,
  isReadyToPublish,
  summarizePublishSkips,
  type PublishBlocker,
} from "@/lib/admin/merchandising-readiness";
import { requireAdminPermission } from "@/lib/admin/require-admin-permission";
import { getAdminAccessToken } from "@/lib/admin/session";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type IntegrationActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function pullMoySkladCatalogAction(): Promise<IntegrationActionState> {
  const auth = await requireAdminPermission("integrations:write");
  if (!auth.ok) {
    return { error: auth.error };
  }

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
  const auth = await requireAdminPermission("integrations:write");
  if (!auth.ok) {
    return { error: auth.error };
  }

  const result = await mutateMoySklad("/api/v1/admin/integrations/moysklad/sync/stock", "POST");
  if (!result.ok) {
    return { error: "Не удалось обновить остатки." };
  }
  revalidatePath("/admin/integrations/moysklad");
  revalidatePath("/admin/inventory");
  return { success: true, message: "Остатки обновлены из МойСклад." };
}

export async function fullResyncMoySkladAction(): Promise<IntegrationActionState> {
  const auth = await requireAdminPermission("integrations:write");
  if (!auth.ok) {
    return { error: auth.error };
  }

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
  const auth = await requireAdminPermission("integrations:write");
  if (!auth.ok) {
    return { error: auth.error };
  }

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
  const auth = await requireAdminPermission("catalog:write");
  if (!auth.ok) {
    return { error: auth.error };
  }

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

export async function bulkAssignMoySkladCategoryAction(
  productIds: string[],
  categoryId: string,
): Promise<IntegrationActionState> {
  if (!categoryId) {
    return { error: "Выберите категорию." };
  }
  if (productIds.length === 0) {
    return { error: "Выберите хотя бы один товар." };
  }

  let assigned = 0;
  let lastError: string | undefined;

  for (const productId of productIds) {
    const result = await patchProduct(productId, { category_id: categoryId });
    if (result.error) {
      lastError = result.error;
    } else {
      assigned += 1;
    }
  }

  revalidatePath("/admin/integrations/moysklad/import");
  revalidatePath("/admin/catalog");

  if (assigned === 0) {
    return { error: lastError ?? "Не удалось назначить категорию." };
  }

  if (assigned < productIds.length) {
    return {
      success: true,
      message: `Категория назначена для ${assigned} из ${productIds.length} товаров.`,
    };
  }

  return {
    success: true,
    message: `Категория назначена для ${assigned} товар(ов). Добавьте фото и опубликуйте на странице редактирования.`,
  };
}

export async function bulkPublishMoySkladProductsAction(
  productIds: string[],
): Promise<IntegrationActionState> {
  const auth = await requireAdminPermission("catalog:write");
  if (!auth.ok) {
    return { error: auth.error };
  }

  if (productIds.length === 0) {
    return { error: "Выберите хотя бы один товар." };
  }

  const token = await getAdminAccessToken();
  if (!token) {
    return { error: "Требуется вход в админ-панель." };
  }

  let published = 0;
  const skipCounts: Partial<Record<PublishBlocker, number>> = {};
  let lastError: string | undefined;

  for (const productId of productIds) {
    const detailRes = await fetch(`${API_BASE}/api/v1/admin/catalog/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!detailRes.ok) {
      lastError = "Не удалось загрузить товар.";
      continue;
    }
    const product = (await detailRes.json()) as AdminProduct;

    if (!isReadyToPublish(product)) {
      for (const blocker of getPublishBlockers(product)) {
        skipCounts[blocker] = (skipCounts[blocker] ?? 0) + 1;
      }
      continue;
    }

    const result = await patchProduct(productId, { status: "active" });
    if (result.error) {
      lastError = result.error;
    } else {
      published += 1;
    }
  }

  revalidatePath("/admin/integrations/moysklad/import");
  revalidatePath("/admin/catalog");

  const skipped = Object.values(skipCounts).reduce((sum, count) => sum + (count ?? 0), 0);
  const skipSummary = summarizePublishSkips(skipCounts);
  const skipNote = skipped > 0 ? ` Пропущено: ${skipSummary}.` : "";

  if (published === 0) {
    if (skipped > 0) {
      return {
        error: `Не удалось опубликовать. ${skipSummary}. Добавьте категорию, фото и фото по цветам.`,
      };
    }
    return { error: lastError ?? "Не удалось опубликовать товары." };
  }

  if (published < productIds.length) {
    return {
      success: true,
      message: `Опубликовано ${published} из ${productIds.length}.${skipNote}`,
    };
  }

  return {
    success: true,
    message: `Опубликовано ${published} товар(ов).${skipNote}`,
  };
}

export async function hideProductAction(productId: string): Promise<IntegrationActionState> {
  const result = await patchProduct(productId, { status: "archived" });
  if (result.error) {
    return result;
  }

  return { success: true, message: "Товар скрыт с витрины." };
}

export async function exportMoySkladOrderAction(
  orderNumber: string,
): Promise<IntegrationActionState> {
  const auth = await requireAdminPermission("integrations:write");
  if (!auth.ok) {
    return { error: auth.error };
  }

  const result = await mutateMoySklad(
    `/api/v1/admin/integrations/moysklad/orders/${encodeURIComponent(orderNumber)}/export`,
    "POST",
  );
  if (!result.ok) {
    if (result.status === 403) {
      return { error: "Недостаточно прав для экспорта заказов." };
    }
    return { error: "Не удалось экспортировать заказ в МойСклад." };
  }

  const data = result.data as { status?: string; error?: string | null } | null;
  if (data?.status === "failed" || data?.error) {
    return { error: data.error ?? "Экспорт завершился с ошибкой." };
  }

  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/admin/integrations/moysklad");
  revalidatePath("/admin/orders");
  return {
    success: true,
    message: "Заказ экспортирован в МойСклад.",
  };
}
