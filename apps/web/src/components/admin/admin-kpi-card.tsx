import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminKpiCardVariant = "default" | "warning" | "danger" | "success";

type AdminKpiCardProps = {
  label: string;
  value: string | number;
  description?: string;
  href?: string;
  variant?: AdminKpiCardVariant;
  icon?: ReactNode;
};

const cardVariantClass: Record<AdminKpiCardVariant, string> = {
  default: "",
  warning: "bg-amber-50/40 ring-amber-500/15 dark:bg-amber-950/15",
  danger: "bg-destructive/5 ring-destructive/15",
  success: "bg-emerald-50/40 ring-emerald-500/15 dark:bg-emerald-950/15",
};

const valueVariantClass: Record<AdminKpiCardVariant, string> = {
  default: "text-foreground",
  warning: "text-amber-800 dark:text-amber-300",
  danger: "text-destructive",
  success: "text-emerald-800 dark:text-emerald-300",
};

function AdminKpiCardContent({
  label,
  value,
  description,
  variant = "default",
  icon,
}: AdminKpiCardProps) {
  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          {icon ? (
            <div className="shrink-0 text-muted-foreground/60 [&>svg]:size-4">{icon}</div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <p
          className={cn(
            "text-3xl font-semibold tabular-nums tracking-tight",
            valueVariantClass[variant],
          )}
        >
          {value}
        </p>
        {description ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </>
  );
}

export function AdminKpiCard({
  label,
  value,
  description,
  href,
  variant = "default",
  icon,
}: AdminKpiCardProps) {
  const cardClassName = cn(
    "h-full transition-colors",
    cardVariantClass[variant],
    href && "hover:bg-muted/40",
  );

  const content = (
    <AdminKpiCardContent
      label={label}
      value={value}
      description={description}
      variant={variant}
      icon={icon}
    />
  );

  if (href) {
    return (
      <Card className={cardClassName}>
        <Link href={href} className="block h-full">
          {content}
        </Link>
      </Card>
    );
  }

  return <Card className={cardClassName}>{content}</Card>;
}
