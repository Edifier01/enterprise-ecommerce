"use client";

import { useTransition } from "react";

import { toggleWholesalerAction } from "@/app/actions/admin-customers";
import type { AdminCustomer } from "@/lib/admin/customers";
import { siteConfig } from "@/lib/store/site-config";

type AdminCustomersTableProps = {
  customers: AdminCustomer[];
};

export function AdminCustomersTable({ customers }: AdminCustomersTableProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(customer: AdminCustomer) {
    startTransition(async () => {
      await toggleWholesalerAction(customer.id, !customer.is_wholesaler);
    });
  }

  if (customers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Зарегистрированных клиентов пока нет.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Статус</th>
            <th className="px-4 py-3 font-medium">Регистрация</th>
            <th className="px-4 py-3 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">{customer.email}</td>
              <td className="px-4 py-3">
                {customer.is_wholesaler ? (
                  <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Оптовик
                  </span>
                ) : (
                  <span className="text-muted-foreground">Розница</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(customer.created_at).toLocaleDateString(siteConfig.locale)}
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggle(customer)}
                  className="rounded-md border border-input px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  {customer.is_wholesaler ? "Снять опт" : "Назначить опт"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
