"use server";

import { revalidatePath } from "next/cache";

import { updateCustomerWholesaler } from "@/lib/admin/customers";

export type CustomerActionState = {
  error?: string;
};

export async function toggleWholesalerAction(
  customerId: string,
  isWholesaler: boolean,
): Promise<CustomerActionState> {
  const result = await updateCustomerWholesaler(customerId, isWholesaler);
  if (!result) {
    return { error: "Не удалось обновить статус клиента." };
  }
  revalidatePath("/admin/customers");
  return {};
}
