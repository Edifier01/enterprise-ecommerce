import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminOrderDetail } from "@/components/admin/orders/admin-order-detail";
import { getAdminOrder } from "@/lib/admin/orders";
import { getAdminOrdersReturnLabel, parseAdminReturnPath } from "@/lib/admin/orders-list-url";
import {
  ADMIN_PAGE_FORBIDDEN_MESSAGE,
  adminHasPermission,
} from "@/lib/admin/require-admin-permission";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Заказ — Админ-панель",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function AdminOrderDetailPage({ params, searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!adminHasPermission(admin, "admin:read")) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {ADMIN_PAGE_FORBIDDEN_MESSAGE}
      </p>
    );
  }

  const { orderNumber } = await params;
  const { from } = await searchParams;
  const returnTo = parseAdminReturnPath(from);
  const backLabel = getAdminOrdersReturnLabel(returnTo);
  const orderResult = await getAdminOrder(orderNumber);
  if (!orderResult.ok) {
    if (orderResult.status === 404) notFound();
    return (
      <p className="text-sm text-destructive" role="alert">
        {orderResult.error}
      </p>
    );
  }

  const order = orderResult.data;

  const canWrite = admin.permissions.includes("orders:write");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={returnTo}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {backLabel}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Заказ {order.order_number}
        </h1>
      </div>

      <AdminOrderDetail
        order={order}
        canWrite={canWrite}
        canExport={admin.permissions.includes("integrations:write")}
      />
    </div>
  );
}
