"use client";

import {
  AdminDesktopTable,
  AdminMobileCard,
  AdminMobileCardList,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import type { AdminCustomer } from "@/lib/admin/customers";
import { siteConfig } from "@/lib/store/site-config";

type AdminCustomersTableProps = {
  customers: AdminCustomer[];
};

export function AdminCustomersTable({ customers }: AdminCustomersTableProps) {
  if (customers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Зарегистрированных клиентов пока нет.</p>
    );
  }

  return (
    <>
      <AdminMobileCardList>
        {customers.map((customer) => (
          <AdminMobileCard key={customer.id}>
            <div className="space-y-2">
              <p className="break-all text-sm font-medium">{customer.email}</p>
              <AdminMobileCardRow label="Тип">
                {customer.is_wholesaler ? (
                  <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Опт
                  </span>
                ) : (
                  <span className="font-normal text-muted-foreground">Розница</span>
                )}
              </AdminMobileCardRow>
              <AdminMobileCardRow label="Регистрация">
                <span className="font-normal text-muted-foreground">
                  {new Date(customer.created_at).toLocaleDateString(siteConfig.locale)}
                </span>
              </AdminMobileCardRow>
            </div>
          </AdminMobileCard>
        ))}
      </AdminMobileCardList>

      <AdminDesktopTable>
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Тип</th>
              <th className="px-4 py-3 font-medium">Регистрация</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{customer.email}</td>
                <td className="px-4 py-3">
                  {customer.is_wholesaler ? (
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Опт
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Розница</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(customer.created_at).toLocaleDateString(siteConfig.locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminDesktopTable>
    </>
  );
}
