import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type CategoryCardData = {
  slug: string;
  name: string;
  description?: string;
  productCount?: number;
};

export interface CategoryCardProps {
  category: CategoryCardData;
  className?: string;
}

export function CategoryCard({ category, className }: CategoryCardProps) {
  return (
    <Link
      href={`/catalog/${category.slug}`}
      className={cn(
        "group flex h-full flex-col justify-between rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-shadow hover:shadow-md sm:p-5",
        className
      )}
    >
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-primary sm:text-lg">
          {category.name}
        </h3>
        {category.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {category.description}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-sm">
        {typeof category.productCount === "number" ? (
          <span className="text-muted-foreground">
            {category.productCount}{" "}
            {category.productCount === 1
              ? "товар"
              : category.productCount < 5
                ? "товара"
                : "товаров"}
          </span>
        ) : (
          <span className="text-muted-foreground">Смотреть раздел</span>
        )}
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden
        />
      </div>
    </Link>
  );
}
