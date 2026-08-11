import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminFetchErrorState, AdminForbiddenState } from "@/components/admin/admin-error-state";
import { AdminFilterChips } from "@/components/admin/admin-filter-chips";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination, getAdminTotalPages } from "@/components/admin/admin-pagination";
import { AdminSavedViews } from "@/components/admin/admin-saved-views";
import { AdminCustomersSearch } from "@/components/admin/customers/admin-customers-search";
import { AdminCustomersTable } from "@/components/admin/customers/admin-customers-table";
import { ADMIN_CUSTOMERS_PAGE_SIZE } from "@/lib/admin/catalog";
import { listAdminCustomers } from "@/lib/admin/customers";
import {
  buildAdminCustomersListHref,
  parseAdminCustomersWholesalerFilter,
  type AdminCustomersListParams,
} from "@/lib/admin/customers-list-url";
import { adminHasPermission } from "@/lib/admin/require-admin-permission";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Клиенты — Админ",
  robots: { index: false, follow: false },
};

const TYPE_FILTERS = [
  { value: "", label: "Все" },
  { value: "wholesale", label: "Опт" },
  { value: "retail", label: "Розница" },
] as const;

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string; wholesaler?: string }>;
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

  const { page: pageRaw, q, wholesaler: wholesalerRaw } = await searchParams;
  const page = parsePage(pageRaw);
  const query = q?.trim() ?? "";
  const wholesalerFilter = parseAdminCustomersWholesalerFilter(wholesalerRaw);
  const listParams: AdminCustomersListParams = {
    page,
    q: query || undefined,
    wholesaler: wholesalerFilter,
  };

  const customersResult = await listAdminCustomers(page, query || undefined, {
    wholesaler: wholesalerFilter,
  });

  if (!customersResult.ok) {
    return <AdminFetchErrorState message={customersResult.error} retryHref="/admin/customers" />;
  }

  const data = customersResult.data;
  const totalPages = getAdminTotalPages(data.total, ADMIN_CUSTOMERS_PAGE_SIZE);

  function buildHref(nextPage: number) {
    return buildAdminCustomersListHref({ ...listParams, page: nextPage });
  }

  function filterHref(filterValue: string): string {
    const base = { q: query || undefined };
    if (filterValue === "wholesale") {
      return buildAdminCustomersListHref({ ...base, wholesaler: true });
    }
    if (filterValue === "retail") {
      return buildAdminCustomersListHref({ ...base, wholesaler: false });
    }
    return buildAdminCustomersListHref(base);
  }

  const activeFilter =
    wholesalerFilter === true ? "wholesale" : wholesalerFilter === false ? "retail" : "";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Клиенты"
        description={
          query
            ? `Результаты поиска (${data.total})`
            : `Список зарегистрированных клиентов (${data.total} всего).`
        }
      />

      <AdminSavedViews
        activeId={activeFilter || "all"}
        views={TYPE_FILTERS.map((filter) => ({
          id: filter.value || "all",
          label: filter.label,
          href: filterHref(filter.value),
        }))}
      />

      <AdminFilterChips
        items={TYPE_FILTERS.map((filter) => ({
          label: filter.label,
          href: filterHref(filter.value),
          active: activeFilter === filter.value,
        }))}
        resetHref={buildAdminCustomersListHref({ q: query || undefined })}
      />

      <AdminCustomersSearch
        defaultQuery={query}
        wholesaler={wholesalerFilter}
      />

      <AdminCustomersTable customers={data.items} searchQuery={query || undefined} />
      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
