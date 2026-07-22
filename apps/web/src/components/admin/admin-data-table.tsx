"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Columns3 } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import {
  AdminDesktopTable,
  AdminMobileCardList,
} from "@/components/admin/admin-mobile-card";
import { cn } from "@/lib/utils";

export type AdminDataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null;
  headerClassName?: string;
  cellClassName?: string;
  defaultHidden?: boolean;
};

type SortState = {
  columnId: string;
  direction: "asc" | "desc";
};

export type AdminDataTableProps<T> = {
  columns: AdminDataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  stickyHeader?: boolean;
  density?: "compact" | "comfortable";
  mobile?: "cards" | "hidden";
  renderMobileCard?: (row: T) => ReactNode;
  emptyState?: ReactNode;
  tableId?: string;
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  toolbar?: ReactNode;
  className?: string;
  minWidthClassName?: string;
};

function loadHiddenColumns(tableId: string | undefined, defaults: string[]): Set<string> {
  if (!tableId || typeof window === "undefined") {
    return new Set(defaults);
  }
  try {
    const raw = window.localStorage.getItem(`admin-table:${tableId}:hidden`);
    if (!raw) return new Set(defaults);
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set(defaults);
  }
}

export function AdminDataTable<T>({
  columns,
  rows,
  getRowId,
  stickyHeader = true,
  density = "comfortable",
  mobile = "cards",
  renderMobileCard,
  emptyState,
  tableId,
  selectable = false,
  selectedIds,
  onSelectionChange,
  toolbar,
  className,
  minWidthClassName = "min-w-[720px]",
}: AdminDataTableProps<T>) {
  const defaultHidden = useMemo(
    () => columns.filter((column) => column.defaultHidden).map((column) => column.id),
    [columns],
  );
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(() =>
    loadHiddenColumns(tableId, defaultHidden),
  );
  const [sort, setSort] = useState<SortState | null>(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  useEffect(() => {
    if (!tableId) return;
    window.localStorage.setItem(
      `admin-table:${tableId}:hidden`,
      JSON.stringify([...hiddenColumnIds]),
    );
  }, [hiddenColumnIds, tableId]);

  const visibleColumns = columns.filter((column) => !hiddenColumnIds.has(column.id));

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((entry) => entry.id === sort.columnId);
    if (!column?.sortValue) return rows;

    const direction = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((left, right) => {
      const leftValue = column.sortValue?.(left);
      const rightValue = column.sortValue?.(right);
      if (leftValue == null && rightValue == null) return 0;
      if (leftValue == null) return 1;
      if (rightValue == null) return -1;
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction;
      }
      return String(leftValue).localeCompare(String(rightValue), "ru") * direction;
    });
  }, [columns, rows, sort]);

  const cellPadding = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const allSelected =
    selectable &&
    sortedRows.length > 0 &&
    sortedRows.every((row) => selectedIds?.has(getRowId(row)));

  function toggleSort(columnId: string, sortable: boolean) {
    if (!sortable) return;
    setSort((current) => {
      if (current?.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { columnId, direction: "desc" };
      }
      return null;
    });
  }

  function toggleRowSelection(rowId: string) {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds ?? []);
    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    onSelectionChange(next);
  }

  function toggleAllSelection() {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
      return;
    }
    onSelectionChange(new Set(sortedRows.map((row) => getRowId(row))));
  }

  if (rows.length === 0) {
    return (
      emptyState ?? (
        <AdminEmptyState title="Нет данных" description="Записи не найдены для текущих фильтров." />
      )
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {(toolbar || tableId) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">{toolbar}</div>
          {tableId ? (
            <div className="relative">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
                aria-expanded={showColumnMenu}
                onClick={() => setShowColumnMenu((open) => !open)}
              >
                <Columns3 className="size-4" aria-hidden />
                Колонки
              </button>
              {showColumnMenu ? (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-background p-2 shadow-lg">
                  {columns.map((column) => {
                    const visible = !hiddenColumnIds.has(column.id);
                    return (
                      <label
                        key={column.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={visible}
                          onChange={() => {
                            setHiddenColumnIds((current) => {
                              const next = new Set(current);
                              if (next.has(column.id)) {
                                next.delete(column.id);
                              } else {
                                next.add(column.id);
                              }
                              return next;
                            });
                          }}
                        />
                        {column.header}
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {mobile === "cards" && renderMobileCard ? (
        <AdminMobileCardList>{sortedRows.map((row) => renderMobileCard(row))}</AdminMobileCardList>
      ) : null}

      <AdminDesktopTable className="rounded-xl">
        <table className={cn("w-full text-sm", minWidthClassName)}>
          <thead
            className={cn(
              "border-b border-border bg-muted/40 text-left text-muted-foreground",
              stickyHeader && "sticky top-0 z-10",
            )}
          >
            <tr>
              {selectable ? (
                <th className={cn(cellPadding, "w-10")}>
                  <input
                    type="checkbox"
                    aria-label="Выбрать все строки"
                    checked={allSelected}
                    onChange={toggleAllSelection}
                  />
                </th>
              ) : null}
              {visibleColumns.map((column) => {
                const sortable = Boolean(column.sortValue);
                const activeSort = sort?.columnId === column.id;
                return (
                  <th key={column.id} className={cn(cellPadding, column.headerClassName)}>
                    {sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-foreground"
                        onClick={() => toggleSort(column.id, sortable)}
                      >
                        {column.header}
                        {activeSort ? (
                          sort.direction === "asc" ? (
                            <ChevronUp className="size-4" aria-hidden />
                          ) : (
                            <ChevronDown className="size-4" aria-hidden />
                          )
                        ) : null}
                      </button>
                    ) : (
                      <span className="font-medium">{column.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const rowId = getRowId(row);
              return (
                <tr key={rowId} className="border-b border-border/60 align-top">
                  {selectable ? (
                    <td className={cellPadding}>
                      <input
                        type="checkbox"
                        aria-label="Выбрать строку"
                        checked={selectedIds?.has(rowId) ?? false}
                        onChange={() => toggleRowSelection(rowId)}
                      />
                    </td>
                  ) : null}
                  {visibleColumns.map((column) => (
                    <td key={column.id} className={cn(cellPadding, column.cellClassName)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </AdminDesktopTable>
    </div>
  );
}
