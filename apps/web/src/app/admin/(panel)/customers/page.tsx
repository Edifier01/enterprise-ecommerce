import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminFetchErrorState, AdminForbiddenState } from "@/components/admin/admin-error-state";
import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import { AdminCustomersSearch } from "@/components/admin/customers/admin-customers-search";
import { AdminCustomersTable } from "@/components/admin/customers/admin-customers-table";
import { ADMIN_CUSTOMERS_PAGE_SIZE } from "@/lib/admin/catalog";
import { listAdminCustomers } from "@/lib/admin/customers";
import {
  adminHasPermission,
} from "@/lib/admin/require-admin-permission";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Клиенты — Админ",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
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
  if (!adminHasPermission(admin, "customers:read")) {
    return <AdminForbiddenState />;
  }

  const { page: pageRaw, q } = await searchParams;
  const page = parsePage(pageRaw);
  const query = q?.trim() ?? "";
  const customersResult = await listAdminCustomers(page, query || undefined);

  if (!customersResult.ok) {
    return <AdminFetchErrorState message={customersResult.error} retryHref="/admin/customers" />;
  }

  const data = customersResult.data;
  const totalPages = getAdminTotalPages(data.total, ADMIN_CUSTOMERS_PAGE_SIZE);

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (nextPage > 1) params.set("page", String(nextPage));
    if (query) params.set("q", query);
    const queryString = params.toString();
    return queryString ? `/admin/customers?${queryString}` : "/admin/customers";
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Клиенты</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Список зарегистрированных клиентов. Статус «Опт» назначается только при регистрации
          через форму для оптовиков ({data.total} всего).
        </p>
      </header>

      <AdminCustomersSearch defaultQuery={query} />

      <AdminCustomersTable customers={data.items} searchQuery={query || undefined} />
      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
