import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminFormSectionProps = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function AdminFormSection({
  id,
  title,
  description,
  children,
  className,
}: AdminFormSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 rounded-lg border border-border bg-card p-4 lg:scroll-mt-24 md:p-6",
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
