"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseAdminApiError } from "@/lib/admin/parse-api-error";
import { getAdminAccessToken } from "@/lib/admin/session";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type CatalogActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function adminMutate(
  path: string,
  method: string,
  body: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; error: CatalogActionState }> {
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

function buildProductBody(formData: FormData, includeSku: boolean): Record<string, unknown> {
  const name = formData.get("name");
  const slug = formData.get("slug");
  const price = formData.get("price_cents");
  const status = formData.get("status");
  const categoryId = formData.get("category_id");
  const compareAtRaw = formData.get("compare_at_price_cents");
  const wholesaleRaw = formData.get("wholesale_price_cents");

  if (
    typeof name !== "string" ||
    typeof slug !== "string" ||
    typeof price !== "string" ||
    typeof status !== "string"
  ) {
    throw new Error("INVALID_FORM");
  }

  const body: Record<string, unknown> = {
    name,
    slug,
    price_cents: Number(price),
    status,
    category_id: typeof categoryId === "string" && categoryId ? categoryId : null,
    description: readOptionalString(formData, "description"),
    image_url: readOptionalString(formData, "image_url"),
  };

  if (includeSku) {
    const sku = formData.get("sku");
    if (typeof sku !== "string") {
      throw new Error("INVALID_FORM");
    }
    body.sku = sku;
  }

  if (typeof compareAtRaw === "string" && compareAtRaw.trim() !== "") {
    body.compare_at_price_cents = Number(compareAtRaw);
  }

  if (typeof wholesaleRaw === "string" && wholesaleRaw.trim() !== "") {
    body.wholesale_price_cents = Number(wholesaleRaw);
  }

  return body;
}

export async function createProductAction(
  _prev: CatalogActionState | null,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const body = buildProductBody(formData, true);
    const result = await adminMutate("/api/v1/admin/catalog/products", "POST", body);

    if (!result.ok) return result.error;

    revalidatePath("/admin/catalog");
    revalidatePath("/catalog");
    redirect("/admin/catalog");
  } catch {
    return { error: "Некорректные данные формы." };
  }
}

export async function updateProductAction(
  productId: string,
  _prev: CatalogActionState | null,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const body = buildProductBody(formData, false);
    const categoryId = formData.get("category_id");

    const result = await adminMutate(`/api/v1/admin/catalog/products/${productId}`, "PATCH", {
      ...body,
      clear_category: !(typeof categoryId === "string" && categoryId),
    });

    if (!result.ok) return result.error;

    revalidatePath("/admin/catalog");
    revalidatePath(`/admin/catalog/${productId}/edit`);
    revalidatePath("/catalog");
    redirect("/admin/catalog");
  } catch {
    return { error: "Некорректные данные формы." };
  }
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

  revalidatePath("/admin/catalog/categories");
  revalidatePath("/catalog");
  return {};
}

export async function updateCategoryAction(
  categoryId: string,
  isActive: boolean,
): Promise<CatalogActionState> {
  const result = await adminMutate(
    `/api/v1/admin/catalog/categories/${categoryId}`,
    "PATCH",
    { is_active: isActive },
  );

  if (!result.ok) return result.error;

  revalidatePath("/admin/catalog/categories");
  revalidatePath("/catalog");
  return {};
}

export async function updateVariantWholesaleAction(
  variantId: string,
  formData: FormData,
): Promise<CatalogActionState> {
  const raw = formData.get("wholesale_price_cents");
  if (typeof raw !== "string" || raw === "") {
    return { error: "Укажите оптовую цену." };
  }
  const wholesalePriceCents = Number(raw);
  if (!Number.isFinite(wholesalePriceCents) || wholesalePriceCents < 0) {
    return { error: "Некорректная оптовая цена." };
  }

  const result = await adminMutate(`/api/v1/admin/catalog/variants/${variantId}`, "PATCH", {
    wholesale_price_cents: wholesalePriceCents,
  });

  if (!result.ok) return result.error;

  revalidatePath("/admin/catalog");
  revalidatePath("/catalog");
  return {};
}

export async function saveVariantWholesaleFormAction(
  variantId: string,
  formData: FormData,
): Promise<void> {
  const result = await updateVariantWholesaleAction(variantId, formData);
  if (result.error) {
    throw new Error(result.error);
  }
}

function buildVariantBody(formData: FormData): Record<string, unknown> {
  const sku = formData.get("sku");
  const name = formData.get("name");
  const price = formData.get("price_cents");
  const wholesaleRaw = formData.get("wholesale_price_cents");
  const sortOrderRaw = formData.get("sort_order");
  const isDefault = formData.get("is_default") === "true";

  if (typeof sku !== "string" || typeof name !== "string" || typeof price !== "string") {
    throw new Error("INVALID_FORM");
  }

  const body: Record<string, unknown> = {
    sku,
    name,
    price_cents: Number(price),
    is_default: isDefault,
    sort_order: typeof sortOrderRaw === "string" && sortOrderRaw ? Number(sortOrderRaw) : 0,
  };

  if (typeof wholesaleRaw === "string" && wholesaleRaw.trim() !== "") {
    body.wholesale_price_cents = Number(wholesaleRaw);
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
    const body = buildVariantBody(formData);
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

export async function uploadAdminMediaAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const token = await getAdminAccessToken();
  if (!token) {
    return { ok: false, error: "Требуется вход в админ-панель." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Выберите файл изображения." };
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
    return { ok: false, error: parsed.message };
  }

  const data = (await res.json()) as { url: string };
  return { ok: true, url: data.url };
}
