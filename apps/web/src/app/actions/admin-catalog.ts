"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { CATEGORIES_CACHE_TAG } from "@/lib/cache-tags";

import { parseAdminApiError } from "@/lib/admin/parse-api-error";
import { parseAdminReturnPath } from "@/lib/admin/catalog-list-url";
import { parseOptionalRubles, parseRequiredRubles } from "@/lib/admin/money";
import { requireAdminPermission } from "@/lib/admin/require-admin-permission";
import { getAdminAccessToken } from "@/lib/admin/session";
import { siteConfig } from "@/lib/store/site-config";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type CatalogActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

function revalidateStorefrontCategories() {
  revalidateTag(CATEGORIES_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin/catalog");
}

async function adminMutate(
  path: string,
  method: string,
  body: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; error: CatalogActionState }> {
  const auth = await requireAdminPermission("catalog:write");
  if (!auth.ok) {
    return { ok: false, error: { error: auth.error } };
  }

  const token = await getAdminAccessToken();
  if (!token) {
    return { ok: false, error: { error: "Требуется вход в админ-панель." } };
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const parsed = parseAdminApiError(await res.json().catch(() => null));
    return {
      ok: false,
      error: { error: parsed.message, fieldErrors: parsed.fieldErrors },
    };
  }

  return { ok: true, data: await res.json() };
}

function readOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function buildProductBody(
  formData: FormData,
  includeSku: boolean,
  options?: { omitPrice?: boolean },
): Record<string, unknown> {
  const name = formData.get("name");
  const slug = formData.get("slug");
  const status = formData.get("status");
  const categoryId = formData.get("category_id");

  if (typeof name !== "string" || typeof slug !== "string" || typeof status !== "string") {
    throw new Error("INVALID_FORM");
  }

  const body: Record<string, unknown> = {
    name,
    slug,
    currency: siteConfig.defaultCurrency,
    status,
    category_id: typeof categoryId === "string" && categoryId ? categoryId : null,
    description: readOptionalString(formData, "description"),
    image_url: readOptionalString(formData, "image_url"),
    meta_title: readOptionalString(formData, "meta_title"),
    meta_description: readOptionalString(formData, "meta_description"),
  };

  if (!options?.omitPrice) {
    let priceCents: number;
    let compareAtCents: number | undefined;
    let wholesaleCents: number | undefined;

    try {
      priceCents = parseRequiredRubles(formData.get("price_rub"));
      compareAtCents = parseOptionalRubles(formData.get("compare_at_price_rub"));
      wholesaleCents = parseOptionalRubles(formData.get("wholesale_price_rub"));
    } catch {
      throw new Error("INVALID_FORM");
    }

    body.price_cents = priceCents;

    if (compareAtCents !== undefined) {
      body.compare_at_price_cents = compareAtCents;
    }

    if (includeSku && wholesaleCents !== undefined) {
      body.wholesale_price_cents = wholesaleCents;
    }
  } else {
    const compareAtCents = parseOptionalRubles(formData.get("compare_at_price_rub"));
    if (compareAtCents !== undefined) {
      body.compare_at_price_cents = compareAtCents;
    }
  }

  if (includeSku) {
    const sku = formData.get("sku");
    if (typeof sku !== "string") {
      throw new Error("INVALID_FORM");
    }
    body.sku = sku;
  }

  return body;
}

function catalogListRedirectPath(formData: FormData): string {
  const returnTo = formData.get("return_to");
  if (typeof returnTo === "string") {
    return parseAdminReturnPath(returnTo, "/admin/catalog?all=1");
  }

  const categoryId = formData.get("category_id");
  if (typeof categoryId === "string" && categoryId) {
    return `/admin/catalog?category_id=${categoryId}`;
  }
  return "/admin/catalog?all=1";
}

export async function updateProductAction(
  productId: string,
  _prev: CatalogActionState | null,
  formData: FormData,
): Promise<CatalogActionState> {
  let body: Record<string, unknown>;
  const categoryId = formData.get("category_id");

  try {
    body = buildProductBody(formData, false, {
      omitPrice: formData.get("sync_source") === "moysklad",
    });
  } catch {
    return { error: "Некорректные данные формы." };
  }

  const result = await adminMutate(`/api/v1/admin/catalog/products/${productId}`, "PATCH", {
    ...body,
    clear_category: !(typeof categoryId === "string" && categoryId),
  });

  if (!result.ok) return result.error;

  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/catalog/${productId}/edit`);
  revalidatePath("/catalog");

  const intent = formData.get("intent");
  if (intent === "close") {
    redirect(catalogListRedirectPath(formData));
  }

  return { success: true };
}

export async function createCategoryAction(
  _prev: CatalogActionState | null,
  formData: FormData,
): Promise<CatalogActionState> {
  const slug = formData.get("slug");
  const name = formData.get("name");
  const sortOrder = formData.get("sort_order");

  if (typeof slug !== "string" || typeof name !== "string" || typeof sortOrder !== "string") {
    return { error: "Некорректные данные формы." };
  }

  const result = await adminMutate("/api/v1/admin/catalog/categories", "POST", {
    slug,
    name,
    description: readOptionalString(formData, "description"),
    parent_id: readOptionalString(formData, "parent_id"),
    sort_order: Number(sortOrder) || 0,
    is_active: true,
  });

  if (!result.ok) return result.error;

  revalidateStorefrontCategories();
  revalidatePath("/admin/catalog/categories");
  return { success: true };
}

export async function updateCategoryActiveAction(
  categoryId: string,
  isActive: boolean,
): Promise<CatalogActionState> {
  const result = await adminMutate(
    `/api/v1/admin/catalog/categories/${categoryId}`,
    "PATCH",
    { is_active: isActive },
  );

  if (!result.ok) return result.error;

  revalidateStorefrontCategories();
  revalidatePath("/admin/catalog/categories");
  return { success: true };
}

export async function updateCategoryDetailsAction(
  categoryId: string,
  _prev: CatalogActionState | null,
  formData: FormData,
): Promise<CatalogActionState> {
  const name = formData.get("name");
  const slug = formData.get("slug");
  const sortOrder = formData.get("sort_order");
  const parentId = formData.get("parent_id");

  if (typeof name !== "string" || typeof slug !== "string") {
    return { error: "Некорректные данные формы." };
  }

  const body: Record<string, unknown> = {
    name,
    slug,
    description: readOptionalString(formData, "description"),
    sort_order: typeof sortOrder === "string" ? Number(sortOrder) || 0 : 0,
  };

  if (typeof parentId === "string" && parentId) {
    body.parent_id = parentId;
  } else {
    body.clear_parent = true;
  }

  const result = await adminMutate(
    `/api/v1/admin/catalog/categories/${categoryId}`,
    "PATCH",
    body,
  );

  if (!result.ok) return result.error;

  revalidateStorefrontCategories();
  revalidatePath("/admin/catalog/categories");
  return { success: true };
}

export async function deleteCategoryAction(categoryId: string): Promise<CatalogActionState> {
  const auth = await requireAdminPermission("catalog:write");
  if (!auth.ok) {
    return { error: auth.error };
  }

  const token = await getAdminAccessToken();
  if (!token) {
    return { error: "Требуется вход в админ-панель." };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/catalog/categories/${categoryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const parsed = parseAdminApiError(await res.json().catch(() => null));
    return { error: parsed.message };
  }

  revalidateStorefrontCategories();
  revalidatePath("/admin/catalog/categories");
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/integrations/moysklad/import");
  return { success: true };
}

function buildVariantBody(
  formData: FormData,
  options?: { moyskladSynced?: boolean },
): Record<string, unknown> {
  if (options?.moyskladSynced) {
    const sortOrderRaw = formData.get("sort_order");
    const isDefault = formData.get("is_default") === "true";
    return {
      is_default: isDefault,
      sort_order: typeof sortOrderRaw === "string" && sortOrderRaw ? Number(sortOrderRaw) : 0,
    };
  }

  const sku = formData.get("sku");
  const name = formData.get("name");
  const sortOrderRaw = formData.get("sort_order");
  const isDefault = formData.get("is_default") === "true";

  if (typeof sku !== "string" || typeof name !== "string") {
    throw new Error("INVALID_FORM");
  }

  let priceCents: number;
  let wholesaleCents: number | undefined;

  try {
    priceCents = parseRequiredRubles(formData.get("price_rub"));
    wholesaleCents = parseOptionalRubles(formData.get("wholesale_price_rub"));
  } catch {
    throw new Error("INVALID_FORM");
  }

  const body: Record<string, unknown> = {
    sku,
    name,
    price_cents: priceCents,
    is_default: isDefault,
    sort_order: typeof sortOrderRaw === "string" && sortOrderRaw ? Number(sortOrderRaw) : 0,
  };

  if (wholesaleCents !== undefined) {
    body.wholesale_price_cents = wholesaleCents;
  }

  return body;
}

export async function createVariantAction(
  productId: string,
  _prev: CatalogActionState | null,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const body = buildVariantBody(formData);
    const result = await adminMutate(
      `/api/v1/admin/catalog/products/${productId}/variants`,
      "POST",
      body,
    );

    if (!result.ok) return result.error;

    revalidatePath("/admin/catalog");
    revalidatePath(`/admin/catalog/${productId}/edit`);
    revalidatePath("/catalog");
    return {};
  } catch {
    return { error: "Некорректные данные формы." };
  }
}

export async function updateVariantAction(
  variantId: string,
  productId: string,
  _prev: CatalogActionState | null,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const body = buildVariantBody(formData, {
      moyskladSynced: formData.get("sync_source") === "moysklad",
    });
    const result = await adminMutate(
      `/api/v1/admin/catalog/variants/${variantId}`,
      "PATCH",
      body,
    );

    if (!result.ok) return result.error;

    revalidatePath("/admin/catalog");
    revalidatePath(`/admin/catalog/${productId}/edit`);
    revalidatePath("/catalog");
    return {};
  } catch {
    return { error: "Некорректные данные формы." };
  }
}

function translateMediaUploadError(message: string): string {
  if (message === "Invalid image file" || message.startsWith("Invalid image file.")) {
    return "Файл не распознан как изображение. Сохраните фото в JPEG, PNG, WebP или GIF.";
  }
  if (message.startsWith("Unsupported image type")) {
    return "Формат не поддерживается. Используйте JPEG, PNG, WebP или GIF.";
  }
  if (message === "Empty file") {
    return "Файл пустой.";
  }
  if (message === "File too large") {
    return "Файл слишком большой (максимум 5 МБ).";
  }
  return message;
}

export async function uploadAdminMediaAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const auth = await requireAdminPermission("catalog:write");
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const token = await getAdminAccessToken();
  if (!token) {
    return { ok: false, error: "Требуется вход в админ-панель." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Выберите файл изображения." };
  }

  const maxUploadBytes = 5 * 1024 * 1024;
  if (file.size > maxUploadBytes) {
    return { ok: false, error: "Файл слишком большой (максимум 5 МБ)." };
  }

  const body = new FormData();
  body.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/admin/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (!res.ok) {
    const parsed = parseAdminApiError(await res.json().catch(() => null));
    return { ok: false, error: translateMediaUploadError(parsed.message) };
  }

  const data = (await res.json()) as { url: string };
  return { ok: true, url: data.url };
}

export async function addProductImageAction(
  productId: string,
  url: string,
  sortOrder = 0,
  optionColor?: string | null,
): Promise<CatalogActionState> {
  const body: Record<string, unknown> = {
    url,
    sort_order: sortOrder,
  };
  if (optionColor) {
    body.option_color = optionColor;
  }

  const result = await adminMutate(`/api/v1/admin/catalog/products/${productId}/images`, "POST", body);
  if (!result.ok) return result.error;
  revalidatePath(`/admin/catalog/${productId}/edit`);
  return { success: true };
}

export async function updateProductImageAction(
  imageId: string,
  productId: string,
  body: { option_color?: string | null; sort_order?: number; alt_text?: string | null },
): Promise<CatalogActionState> {
  const result = await adminMutate(
    `/api/v1/admin/catalog/products/images/${imageId}`,
    "PATCH",
    body,
  );
  if (!result.ok) return result.error;
  revalidatePath(`/admin/catalog/${productId}/edit`);
  return { success: true };
}

export async function deleteProductImageAction(
  imageId: string,
  productId: string,
): Promise<CatalogActionState> {
  const auth = await requireAdminPermission("catalog:write");
  if (!auth.ok) {
    return { error: auth.error };
  }

  const token = await getAdminAccessToken();
  if (!token) {
    return { error: "Требуется вход в админ-панель." };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/catalog/products/images/${imageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const parsed = parseAdminApiError(await res.json().catch(() => null));
    return { error: parsed.message };
  }

  revalidatePath(`/admin/catalog/${productId}/edit`);
  return { success: true };
}
