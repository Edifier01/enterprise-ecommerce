import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import { AdminCustomersTable } from "@/components/admin/customers/admin-customers-table";
import { ADMIN_CUSTOMERS_PAGE_SIZE } from "@/lib/admin/catalog";
import { listAdminCustomers } from "@/lib/admin/customers";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Клиенты — Админ",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

function parsePage(raw: string | undefined): number {
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const { page: pageRaw } = await searchParams;
  const page = parsePage(pageRaw);
  const data = await listAdminCustomers(page);

  const totalPages = data
    ? getAdminTotalPages(data.total, ADMIN_CUSTOMERS_PAGE_SIZE)
    : 1;

  function buildHref(nextPage: number) {
    return nextPage > 1 ? `/admin/customers?page=${nextPage}` : "/admin/customers";
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Клиенты</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Список зарегистрированных клиентов. Статус «Опт» назначается только при регистрации
          через форму для оптовиков.
          {data ? ` (${data.total} всего).` : ""}
        </p>
      </header>

      {data ? (
        <>
          <AdminCustomersTable customers={data.items} />
          <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      ) : (
        <p className="text-sm text-destructive">Не удалось загрузить список клиентов.</p>
      )}
    </div>
  );
}
