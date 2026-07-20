"use client";

import { Fragment, useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryActiveAction,
  updateCategoryDetailsAction,
  type CatalogActionState,
} from "@/app/actions/admin-catalog";
import { AdminCategorySelect } from "@/components/admin/catalog/admin-category-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCategory } from "@/lib/admin/catalog-shared";
import {
  buildCategoryOptions,
  categoryHasChildren,
  getCategoryParentName,
} from "@/lib/admin/category-options";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClass =
  "min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminCategoryPanelProps = {
  categories: AdminCategory[];
  canWrite?: boolean;
};

function CategoryEditRow({
  category,
  categories,
  onSaved,
}: {
  category: AdminCategory;
  categories: AdminCategory[];
  onSaved: () => void;
}) {
  const boundAction = updateCategoryDetailsAction.bind(null, category.id);
  const [state, formAction, pending] = useActionState<CatalogActionState, FormData>(
    boundAction,
    {},
  );
  const parentLocked = categoryHasChildren(categories, category.id);

  useEffect(() => {
    if (state.success) {
      onSaved();
    }
  }, [state.success, onSaved]);

  return (
    <tr className="border-b border-border/60 bg-muted/20">
      <td colSpan={6} className="p-4">
        <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs">
            Название
            <input name="name" defaultValue={category.name} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Slug
            <input name="slug" defaultValue={category.slug} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Порядок
            <input
              name="sort_order"
              type="number"
              min={0}
              defaultValue={category.sort_order}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2 lg:col-span-3">
            Родитель
            <AdminCategorySelect
              name="parent_id"
              categories={categories}
              defaultValue={category.parent_id ?? ""}
              emptyLabel="Корневая категория"
              excludeId={category.id}
              rootsOnly
              disabled={parentLocked}
            />
            {parentLocked ? (
              <span className="text-muted-foreground">
                У корневой категории с подкатегориями нельзя сменить родителя.
              </span>
            ) : null}
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2 lg:col-span-3">
            Описание
            <textarea
              name="description"
              defaultValue={category.description ?? ""}
              className={textareaClass}
            />
          </label>
          {state.error ? (
            <p className="text-sm text-destructive sm:col-span-2 lg:col-span-3" role="alert">
              {state.error}
            </p>
          ) : null}
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </div>
        </form>
      </td>
    </tr>
  );
}

export function AdminCategoryPanel({ categories, canWrite = false }: AdminCategoryPanelProps) {
  const router = useRouter();
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState(
    createCategoryAction,
    {} as CatalogActionState,
  );
  const [, startTransition] = useTransition();

  const treeRows = buildCategoryOptions(categories);

  useEffect(() => {
    if (createState.success) {
      router.refresh();
    }
  }, [createState.success, router]);

  function handleSaved() {
    setEditingCategoryId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canWrite ? (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Новая категория</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="cat-name" className="text-sm font-medium">
                Название
              </label>
              <input id="cat-name" name="name" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="cat-slug" className="text-sm font-medium">
                Slug (латиница, через дефис)
              </label>
              <input
                id="cat-slug"
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                className={inputClass}
                placeholder="takticheskaya-obuv"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="cat-parent" className="text-sm font-medium">
                Родительская категория
              </label>
              <AdminCategorySelect
                id="cat-parent"
                name="parent_id"
                categories={categories}
                emptyLabel="Корневая категория"
                rootsOnly
              />
              <p className="text-xs text-muted-foreground">
                Подкатегория может иметь только корневую категорию в качестве родителя.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="cat-description" className="text-sm font-medium">
                Описание
              </label>
              <textarea id="cat-description" name="description" className={textareaClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="cat-sort" className="text-sm font-medium">
                Порядок сортировки
              </label>
              <input
                id="cat-sort"
                name="sort_order"
                type="number"
                defaultValue={0}
                min={0}
                className={inputClass}
              />
            </div>
            {createState.error && (
              <p className="text-sm text-destructive" role="alert">
                {createState.error}
              </p>
            )}
            {createState.success && (
              <p className="text-sm text-green-600" role="status">
                Категория создана и уже видна на сайте (если активна).
              </p>
            )}
            <Button type="submit" disabled={createPending}>
              {createPending ? "Создание..." : "Создать категорию"}
            </Button>
          </form>
        </CardContent>
      </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Режим просмотра — изменение категорий доступно только администраторам с правом записи.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Категории</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Название</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Родитель</th>
                  <th className="py-2 pr-4">Товаров</th>
                  <th className="py-2 pr-4">Статус</th>
                  <th className="py-2">Действия</th>
                </tr>
              </thead>
              <tbody>
                {treeRows.map((row) => {
                  const category = categories.find((item) => item.id === row.id);
                  if (!category) return null;
                  const hasSubcategories = categoryHasChildren(categories, category.id);

                  return (
                    <Fragment key={category.id}>
                      <tr className="border-b border-border/60">
                        <td className="py-3 pr-4 font-medium">
                          <span style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
                            {row.depth > 0 ? "↳ " : ""}
                            {category.name}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{category.slug}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {getCategoryParentName(categories, category.parent_id)}
                        </td>
                        <td className="py-3 pr-4 tabular-nums">{category.product_count ?? 0}</td>
                        <td className="py-3 pr-4">
                          {category.is_active ? "Активна" : "Скрыта"}
                        </td>
                        <td className="py-3">
                          {canWrite ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setEditingCategoryId((current) =>
                                  current === category.id ? null : category.id,
                                )
                              }
                            >
                              {editingCategoryId === category.id ? "Закрыть" : "Изменить"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={pendingCategoryId === category.id}
                              onClick={() => {
                                setPendingCategoryId(category.id);
                                startTransition(async () => {
                                  await updateCategoryActiveAction(
                                    category.id,
                                    !category.is_active,
                                  );
                                  setPendingCategoryId(null);
                                  router.refresh();
                                });
                              }}
                            >
                              {category.is_active ? "Скрыть" : "Показать"}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={pendingCategoryId === category.id || hasSubcategories}
                              title={
                                hasSubcategories
                                  ? "Сначала удалите подкатегории"
                                  : undefined
                              }
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Удалить категорию «${category.name}»? Товары останутся без категории и скроются с витрины.`,
                                  )
                                ) {
                                  return;
                                }
                                setActionError(null);
                                setPendingCategoryId(category.id);
                                startTransition(async () => {
                                  const result = await deleteCategoryAction(category.id);
                                  setPendingCategoryId(null);
                                  if (result.error) {
                                    setActionError(result.error);
                                    return;
                                  }
                                  router.refresh();
                                });
                              }}
                            >
                              Удалить
                            </Button>
                          </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                      {canWrite && editingCategoryId === category.id ? (
                        <CategoryEditRow
                          category={category}
                          categories={categories}
                          onSaved={handleSaved}
                        />
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {actionError ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
