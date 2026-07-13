"use server";

import { revalidatePath } from "next/cache";

import { updateAdminOrderStatus } from "@/lib/admin/orders";

export type OrderActionState = {
  error?: string;
  success?: string;
};

export async function updateOrderStatusAction(
  orderNumber: string,
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const status = formData.get("status");
  const reason = formData.get("reason");

  if (status !== "shipped" && status !== "canceled") {
    return { error: "Недопустимый статус." };
  }

  const result = await updateAdminOrderStatus(orderNumber, {
    status,
    reason: typeof reason === "string" && reason.trim() ? reason.trim() : undefined,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);

  return {
    success:
      status === "shipped"
        ? "Заказ отмечен как отправленный."
        : "Заказ отменён.",
  };
}
