import type { AdminCategory } from "@/lib/admin/catalog";
import { buildCategoryOptions } from "@/lib/admin/category-options";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminCategorySelectProps = {
  categories: AdminCategory[];
  name?: string;
  id?: string;
  defaultValue?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  excludeId?: string;
};

export function AdminCategorySelect({
  categories,
  name = "category_id",
  id,
  defaultValue = "",
  allowEmpty = true,
  emptyLabel = "Без категории",
  excludeId,
}: AdminCategorySelectProps) {
  const options = buildCategoryOptions(
    excludeId ? categories.filter((category) => category.id !== excludeId) : categories,
  );

  return (
    <select id={id ?? name} name={name} defaultValue={defaultValue} className={selectClass}>
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
