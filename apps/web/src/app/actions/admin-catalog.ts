"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminAccessToken } from "@/lib/admin/session";

import { getApiBase } from "@/lib/api-base";

const API_BASE = getApiBase();

export type CatalogActionState = {
  error?: string;
};

async function adminMutate(
  path: string,
  method: string,
  body: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const token = await getAdminAccessToken();
  if (!token) {
    return { ok: false, error: "Требуется вход в админ-панель." };
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
    const detail = (await res.json().catch(() => null)) as { detail?: string } | null;
    return { ok: false, error: detail?.detail ?? "Не удалось сохранить изменения." };
  }

  return { ok: true, data: await res.json() };
}

export async function createProductAction(
  _prev: CatalogActionState | null,
  formData: FormData,
): Promise<CatalogActionState> {
  const name = formData.get("name");
  const slug = formData.get("slug");
  const sku = formData.get("sku");
  const price = formData.get("price_cents");
  const wholesaleRaw = formData.get("wholesale_price_cents");
  const status = formData.get("status");
  const categoryId = formData.get("category_id");

  if (
    typeof name !== "string" ||
    typeof slug !== "string" ||
    typeof sku !== "string" ||
    typeof price !== "string" ||
    typeof status !== "string"
  ) {
    return { error: "Некорректные данные формы." };
  }

  const body: Record<string, unknown> = {
    name,
    slug,
    sku,
    price_cents: Number(price),
    status,
    category_id: typeof categoryId === "string" && categoryId ? categoryId : null,
  };
  if (typeof wholesaleRaw === "string" && wholesaleRaw.trim() !== "") {
    body.wholesale_price_cents = Number(wholesaleRaw);
  }

  const result = await adminMutate("/api/v1/admin/catalog/products", "POST", body);

  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/catalog");
  revalidatePath("/catalog");
  redirect("/admin/catalog");
}

export async function updateProductAction(
  productId: string,
  _prev: CatalogActionState | null,
  formData: FormData,
): Promise<CatalogActionState> {
  const name = formData.get("name");
  const slug = formData.get("slug");
  const price = formData.get("price_cents");
  const status = formData.get("status");
  const categoryId = formData.get("category_id");

  if (
    typeof name !== "string" ||
    typeof slug !== "string" ||
    typeof price !== "string" ||
    typeof status !== "string"
  ) {
    return { error: "Некорректные данные формы." };
  }

  const result = await adminMutate(`/api/v1/admin/catalog/products/${productId}`, "PATCH", {
    name,
    slug,
    price_cents: Number(price),
    status,
    category_id: typeof categoryId === "string" && categoryId ? categoryId : null,
    clear_category: !(typeof categoryId === "string" && categoryId),
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/catalog/${productId}/edit`);
  revalidatePath("/catalog");
  redirect("/admin/catalog");
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
    sort_order: Number(sortOrder) || 0,
    is_active: true,
  });

  if (!result.ok) return { error: result.error };

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

  if (!result.ok) return { error: result.error };

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

  if (!result.ok) return { error: result.error };

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
