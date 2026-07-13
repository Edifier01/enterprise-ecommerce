import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminCustomersTable } from "@/components/admin/customers/admin-customers-table";
import { listAdminCustomers } from "@/lib/admin/customers";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Клиенты — Админ",
};

export default async function AdminCustomersPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const data = await listAdminCustomers();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Клиенты</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Управление статусом оптовика. Изменение не влияет на уже оформленные заказы.
        </p>
      </header>

      {data ? (
        <AdminCustomersTable customers={data.items} />
      ) : (
        <p className="text-sm text-destructive">Не удалось загрузить список клиентов.</p>
      )}
    </div>
  );
}
