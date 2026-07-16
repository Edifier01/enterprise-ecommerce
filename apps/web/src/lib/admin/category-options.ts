import type { AdminCategory } from "@/lib/admin/catalog";

export type CategoryOption = {
  id: string;
  label: string;
  depth: number;
};

export function buildCategoryOptions(categories: AdminCategory[]): CategoryOption[] {
  const byParent = new Map<string | null, AdminCategory[]>();

  for (const category of categories) {
    const key = category.parent_id;
    const siblings = byParent.get(key);
    if (siblings) {
      siblings.push(category);
    } else {
      byParent.set(key, [category]);
    }
  }

  const result: CategoryOption[] = [];

  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? [];
    children.sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ru"),
    );
    for (const category of children) {
      const prefix = depth > 0 ? `${"— ".repeat(depth)}` : "";
      result.push({ id: category.id, label: `${prefix}${category.name}`, depth });
      walk(category.id, depth + 1);
    }
  }

  walk(null, 0);
  return result;
}

export function getCategoryParentName(
  categories: AdminCategory[],
  parentId: string | null,
): string {
  if (!parentId) {
    return "—";
  }
  return categories.find((category) => category.id === parentId)?.name ?? parentId;
}
