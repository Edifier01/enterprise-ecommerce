import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MoySkladImportPanel } from "@/components/admin/integrations/moysklad-import-panel";
import { buttonVariants } from "@/components/ui/button";
import { listAdminCategories, listAdminProducts } from "@/lib/admin/catalog";
import { getMoySkladStatus } from "@/lib/admin/integrations/moysklad";
import { getCurrentAdmin } from "@/lib/admin/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Импорт из МойСклад — Админ-панель",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

export default async function MoySkladImportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);

  const [status, categoriesResult, productListResult] = await Promise.all([
    getMoySkladStatus(),
    listAdminCategories(),
    listAdminProducts(page, undefined, undefined, { moyskladPending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/integrations/moysklad"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← К интеграции
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Импорт из МойСклад</h1>
        <p className="text-sm text-muted-foreground">
          Товары без категории не отображаются на витрине. Назначьте категорию и опубликуйте товар.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        <Link
          href="/admin/integrations/moysklad"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Статус
        </Link>
        <Link
          href="/admin/integrations/moysklad/import"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Импорт товаров
          {status?.pending_imports ? ` (${status.pending_imports})` : ""}
        </Link>
      </div>

      {!productListResult.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {productListResult.error}
        </p>
      ) : (
        <MoySkladImportPanel
          products={productListResult.data.items}
          categories={categoriesResult.ok ? categoriesResult.data : []}
          total={productListResult.data.total}
          page={page}
          pageSize={PAGE_SIZE}
          canWrite={admin.permissions.includes("catalog:write")}
        />
      )}
    </div>
  );
}
