import "server-only";

import { adminFetchResult, type AdminFetchResult } from "@/lib/admin/admin-fetch";

export type AdminBulkJobStatus = "pending" | "running" | "completed" | "failed";

export type AdminBulkJobType = "assign_category" | "publish_products";

export type AdminBulkJob = {
  id: string;
  job_type: AdminBulkJobType;
  status: AdminBulkJobStatus;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  skip_reasons: Record<string, number>;
  errors: Array<{ product_id: string; message: string }>;
  result_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export function isAdminBulkJobFinished(job: AdminBulkJob): boolean {
  return job.status === "completed" || job.status === "failed";
}

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
