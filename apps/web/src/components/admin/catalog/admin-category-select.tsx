import type { AdminCategory } from "@/lib/admin/catalog-shared";
import { buildCategoryOptions } from "@/lib/admin/category-options";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminCategorySelectProps = {
  categories: AdminCategory[];
  name?: string;
  id?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  excludeId?: string;
  /** When true, only root categories are selectable (for subcategory parent). */
  rootsOnly?: boolean;
  disabled?: boolean;
};

export function AdminCategorySelect({
  categories,
  name = "category_id",
  id,
  defaultValue = "",
  value,
  onValueChange,
  allowEmpty = true,
  emptyLabel = "Без категории",
  excludeId,
  rootsOnly = false,
  disabled = false,
}: AdminCategorySelectProps) {
  let filtered = excludeId
    ? categories.filter((category) => category.id !== excludeId)
    : categories;
  if (rootsOnly) {
    filtered = filtered.filter((category) => category.parent_id === null);
  }
  const options = buildCategoryOptions(filtered);

  return (
    <select
      id={id ?? name}
      name={name}
      defaultValue={value === undefined ? defaultValue : undefined}
      value={value}
      onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
      disabled={disabled}
      className={selectClass}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
