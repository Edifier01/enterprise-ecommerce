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
