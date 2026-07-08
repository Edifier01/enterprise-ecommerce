import { CategoryCard, type CategoryCardData } from "./category-card";
import { cn } from "@/lib/utils";

export interface CategoryGridProps {
  categories: CategoryCardData[];
  className?: string;
  listClassName?: string;
}

export function CategoryGrid({
  categories,
  className,
  listClassName,
}: CategoryGridProps) {
  if (categories.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Разделы каталога пока недоступны.
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5",
        listClassName,
        className
      )}
    >
      {categories.map((category) => (
        <li key={category.slug} className="min-w-0">
          <CategoryCard category={category} />
        </li>
      ))}
    </ul>
  );
}
