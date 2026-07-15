import Link from "next/link";

import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  titleId?: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  titleId,
  subtitle,
  viewAllHref,
  viewAllLabel = "Смотреть все",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-2",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 id={titleId} className="store-section-title">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {viewAllHref ? (
        <Link href={viewAllHref} className="store-section-link shrink-0">
          {viewAllLabel} →
        </Link>
      ) : null}
    </div>
  );
}
