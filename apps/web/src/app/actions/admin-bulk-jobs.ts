"use server";

import { revalidatePath } from "next/cache";

import {
  createAdminBulkJob,
  getAdminBulkJob,
  type AdminBulkJob,
} from "@/lib/admin/bulk-jobs";
import { requireAdminPermission } from "@/lib/admin/require-admin-permission";

export type BulkJobActionState = {
  error?: string;
  job?: AdminBulkJob;
};

export async function startBulkAssignCategoryJobAction(
  productIds: string[],
  categoryId: string,
): Promise<BulkJobActionState> {
  const auth = await requireAdminPermission("catalog:write");
  if (!auth.ok) {
    return { error: auth.error };
  }
  if (!categoryId) {
    return { error: "Выберите категорию." };
  }
  if (productIds.length === 0) {
    return { error: "Выберите хотя бы один товар." };
  }

  const result = await createAdminBulkJob({
    job_type: "assign_category",
    product_ids: productIds,
    category_id: categoryId,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { job: result.data };
}

export async function startBulkPublishProductsJobAction(
  productIds: string[],
): Promise<BulkJobActionState> {
  const auth = await requireAdminPermission("catalog:write");
  if (!auth.ok) {
    return { error: auth.error };
  }
  if (productIds.length === 0) {
    return { error: "Выберите хотя бы один товар." };
  }

  const result = await createAdminBulkJob({
    job_type: "publish_products",
    product_ids: productIds,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { job: result.data };
}

export async function getBulkJobAction(jobId: string): Promise<BulkJobActionState> {
  const auth = await requireAdminPermission("catalog:write");
  if (!auth.ok) {
    return { error: auth.error };
  }

  const result = await getAdminBulkJob(jobId);
  if (!result.ok) {
    return { error: result.error };
  }

  if (isJobFinished(result.data)) {
    revalidateBulkJobPaths();
  }

  return { job: result.data };
}

function isJobFinished(job: AdminBulkJob): boolean {
  return job.status === "completed" || job.status === "failed";
}

function revalidateBulkJobPaths(): void {
  revalidatePath("/admin/integrations/moysklad/import");
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/catalog/workflow");
}
