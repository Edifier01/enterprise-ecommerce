import "server-only";

import { adminFetchResult, type AdminFetchResult } from "@/lib/admin/admin-fetch";
import type { AdminBulkJob, AdminBulkJobType } from "@/lib/admin/bulk-jobs-shared";

export type { AdminBulkJob, AdminBulkJobStatus, AdminBulkJobType } from "@/lib/admin/bulk-jobs-shared";
export { isAdminBulkJobFinished } from "@/lib/admin/bulk-jobs-shared";

export async function createAdminBulkJob(
  body: {
    job_type: AdminBulkJobType;
    product_ids: string[];
    category_id?: string;
  },
): Promise<AdminFetchResult<AdminBulkJob>> {
  return adminFetchResult<AdminBulkJob>("/api/v1/admin/jobs/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getAdminBulkJob(jobId: string): Promise<AdminFetchResult<AdminBulkJob>> {
  return adminFetchResult<AdminBulkJob>(`/api/v1/admin/jobs/bulk/${jobId}`);
}
