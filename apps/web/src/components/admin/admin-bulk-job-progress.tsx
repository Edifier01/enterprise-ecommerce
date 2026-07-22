"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { getBulkJobAction } from "@/app/actions/admin-bulk-jobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminBulkJob } from "@/lib/admin/bulk-jobs-shared";
import { isAdminBulkJobFinished } from "@/lib/admin/bulk-jobs-shared";
import { cn } from "@/lib/utils";

type AdminBulkJobProgressProps = {
  job: AdminBulkJob;
  title: string;
  onComplete?: (job: AdminBulkJob) => void;
  className?: string;
};

function jobStatusLabel(status: AdminBulkJob["status"]): string {
  switch (status) {
    case "pending":
      return "В очереди";
    case "running":
      return "Выполняется";
    case "completed":
      return "Завершено";
    case "failed":
      return "Ошибка";
    default:
      return status;
  }
}

export function AdminBulkJobProgress({
  job: initialJob,
  title,
  onComplete,
  className,
}: AdminBulkJobProgressProps) {
  const [job, setJob] = useState(initialJob);
  const [, startTransition] = useTransition();
  const completedRef = useRef(false);

  useEffect(() => {
    setJob(initialJob);
    completedRef.current = false;
  }, [initialJob]);

  useEffect(() => {
    if (isAdminBulkJobFinished(job)) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.(job);
      }
      return;
    }

    const timer = window.setInterval(() => {
      startTransition(async () => {
        const result = await getBulkJobAction(job.id);
        if (result.job) {
          setJob(result.job);
        }
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [job.id, job.status, job.processed, onComplete]);

  const progressPercent =
    job.total > 0 ? Math.min(100, Math.round((job.processed / job.total) * 100)) : 0;

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="text-xs text-muted-foreground">{jobStatusLabel(job.status)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-label="Прогресс массовой операции"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Обработано</p>
            <p className="font-medium tabular-nums">
              {job.processed}/{job.total}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Успешно</p>
            <p className="font-medium tabular-nums text-green-700">{job.succeeded}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ошибки</p>
            <p className="font-medium tabular-nums text-destructive">{job.failed}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Пропущено</p>
            <p className="font-medium tabular-nums">{job.skipped}</p>
          </div>
        </div>
        {job.result_message ? (
          <p className="text-sm text-muted-foreground">{job.result_message}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Массовая операция выполняется в фоне. Можно продолжать работу на других страницах.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
