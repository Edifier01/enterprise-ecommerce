import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getCategoryVisual } from "@/lib/store/category-visuals";
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
  const visual = getCategoryVisual(category.slug);
  const Icon = visual.icon;

  return (
    <Link
      href={`/catalog/${category.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-lg border bg-card ring-1 ring-foreground/5 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex aspect-[16/9] items-center justify-center bg-gradient-to-br text-primary-foreground",
          visual.gradientClass,
        )}
      >
        <Icon className="size-10 opacity-90 transition-transform group-hover:scale-105 sm:size-12" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 store-hero-pattern opacity-20"
          aria-hidden
        />
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
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
          {typeof category.productCount === "number" && category.productCount > 0 ? (
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
      </div>
    </Link>
  );
}
