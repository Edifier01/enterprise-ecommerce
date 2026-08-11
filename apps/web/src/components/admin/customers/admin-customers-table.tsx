"use client";

import {
  AdminStatusBadge,
  getCustomerTypeBadge,
} from "@/components/admin/admin-status-badge";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import {
  AdminMobileCard,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import type { AdminCustomer } from "@/lib/admin/customers";
import { formatAdminDate } from "@/lib/admin/format";

type AdminCustomersTableProps = {
  customers: AdminCustomer[];
  searchQuery?: string;
};

function CustomerTypeBadge({ isWholesaler }: { isWholesaler: boolean }) {
  const badge = getCustomerTypeBadge(isWholesaler);
  return <AdminStatusBadge label={badge.label} tone={badge.tone} className="text-xs" />;
}

const columns: AdminDataTableColumn<AdminCustomer>[] = [
  {
    id: "email",
    header: "Email",
    sortValue: (customer) => customer.email,
    cell: (customer) => <span className="break-all">{customer.email}</span>,
  },
  {
    id: "type",
    header: "Тип",
    sortValue: (customer) => (customer.is_wholesaler ? "Опт" : "Розница"),
    cell: (customer) => <CustomerTypeBadge isWholesaler={customer.is_wholesaler} />,
  },
  {
    id: "created_at",
    header: "Регистрация",
    sortValue: (customer) => customer.created_at,
    cell: (customer) => (
      <span className="text-muted-foreground">
        {formatAdminDate(customer.created_at) ?? "—"}
      </span>
    ),
  },
];

export function AdminCustomersTable({ customers, searchQuery }: AdminCustomersTableProps) {
  return (
    <AdminDataTable
      tableId="admin-customers"
      columns={columns}
      rows={customers}
      getRowId={(customer) => customer.id}
      stickyHeader
      density="compact"
      minWidthClassName="min-w-[480px]"
      emptyState={
        <AdminEmptyState
          title={searchQuery ? "Ничего не найдено" : "Зарегистрированных клиентов пока нет."}
          description={
            searchQuery
              ? "Попробуйте изменить поисковый запрос или фильтр."
              : "Клиенты появятся после регистрации на витрине."
          }
        />
      }
      renderMobileCard={(customer) => (
        <AdminMobileCard key={customer.id}>
          <div className="space-y-2">
            <p className="break-all text-sm font-medium">{customer.email}</p>
            <AdminMobileCardRow label="Тип">
              <CustomerTypeBadge isWholesaler={customer.is_wholesaler} />
            </AdminMobileCardRow>
            <AdminMobileCardRow label="Регистрация">
              <span className="font-normal text-muted-foreground">
                {formatAdminDate(customer.created_at) ?? "—"}
              </span>
            </AdminMobileCardRow>
          </div>
        </AdminMobileCard>
      )}
    />
  );
}
