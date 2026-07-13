"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  createCategoryAction,
  updateCategoryAction,
  type CatalogActionState,
} from "@/app/actions/admin-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCategory } from "@/lib/admin/catalog";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminCategoryPanelProps = {
  categories: AdminCategory[];
};

export function AdminCategoryPanel({ categories }: AdminCategoryPanelProps) {
  const router = useRouter();
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState(
    createCategoryAction,
    {} as CatalogActionState,
  );
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-6">
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
                Slug
              </label>
              <input id="cat-slug" name="slug" required className={inputClass} />
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
                className={inputClass}
              />
            </div>
            {createState.error && (
              <p className="text-sm text-destructive" role="alert">
                {createState.error}
              </p>
            )}
            <Button type="submit" disabled={createPending}>
              {createPending ? "Создание..." : "Создать категорию"}
            </Button>
          </form>
        </CardContent>
      </Card>

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
                  <th className="py-2 pr-4">Статус</th>
                  <th className="py-2">Действие</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{category.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{category.slug}</td>
                    <td className="py-3 pr-4">
                      {category.is_active ? "Активна" : "Скрыта"}
                    </td>
                    <td className="py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pendingCategoryId === category.id}
                        onClick={() => {
                          setPendingCategoryId(category.id);
                          startTransition(async () => {
                            await updateCategoryAction(category.id, !category.is_active);
                            setPendingCategoryId(null);
                            router.refresh();
                          });
                        }}
                      >
                        {category.is_active ? "Скрыть" : "Показать"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
