import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminFormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function AdminFormSection({
  title,
  description,
  children,
  className,
}: AdminFormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-4 md:p-6",
        className,
      )}
    >
      <div className="mb-4 space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
