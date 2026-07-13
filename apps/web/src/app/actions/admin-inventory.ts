"use server";

import { revalidatePath } from "next/cache";

import { adjustAdminInventory } from "@/lib/admin/inventory";

export type InventoryActionState = {
  error?: string;
  success?: boolean;
};

export async function adjustInventoryAction(
  variantId: string,
  _prev: InventoryActionState | null,
  formData: FormData,
): Promise<InventoryActionState> {
  const quantity = formData.get("quantity_on_hand");
  const reason = formData.get("reason");
  const version = formData.get("version");

  if (
    typeof quantity !== "string" ||
    typeof reason !== "string" ||
    typeof version !== "string"
  ) {
    return { error: "Некорректные данные формы." };
  }

  const result = await adjustAdminInventory(variantId, {
    quantity_on_hand: Number(quantity),
    reason,
    version: Number(version),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return { success: true };
}
