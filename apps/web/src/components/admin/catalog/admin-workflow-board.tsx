import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminWorkflowLane = {
  id: string;
  title: string;
  description: string;
  count: number;
  href: string;
  tone?: "default" | "warning" | "success";
};

type AdminWorkflowBoardProps = {
  lanes: AdminWorkflowLane[];
};

const toneClasses: Record<NonNullable<AdminWorkflowLane["tone"]>, string> = {
  default: "border-border",
  warning: "border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20",
  success: "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20",
};

export function AdminWorkflowBoard({ lanes }: AdminWorkflowBoardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {lanes.map((lane) => (
        <Link
          key={lane.id}
          href={lane.href}
          className={cn(
            "rounded-xl border p-5 transition-colors hover:border-foreground/20 hover:bg-muted/30",
            toneClasses[lane.tone ?? "default"],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="font-semibold tracking-tight">{lane.title}</h2>
              <p className="text-sm text-muted-foreground">{lane.description}</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-semibold tabular-nums">
              {lane.count}
            </span>
          </div>
          <span className={cn(buttonVariants({ variant: "link" }), "mt-4 h-auto p-0")}>
            Открыть очередь →
          </span>
        </Link>
      ))}
    </div>
  );
}
