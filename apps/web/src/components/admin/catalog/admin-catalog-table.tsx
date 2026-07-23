"use client";

import Image from "next/image";
import Link from "next/link";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import {
  AdminMobileCard,
  AdminMobileCardRow,
} from "@/components/admin/admin-mobile-card";
import { AdminProductHideButton } from "@/components/admin/catalog/admin-product-hide-button";
import { AdminProductPrices } from "@/components/admin/catalog/admin-product-prices";
import { AdminProductStock } from "@/components/admin/catalog/admin-product-stock";
import { MoySkladBadge } from "@/components/admin/moysklad/moysklad-badge";
import {
  formatPrice,
  getAdminProductListPrices,
  PRODUCT_STATUS_LABELS,
  type AdminProduct,
} from "@/lib/admin/catalog-shared";
import {
  buildAdminCatalogEditHref,
  getProductCategoryName,
  type AdminCatalogListParams,
} from "@/lib/admin/catalog-list-url";
import { isMoySkladSynced } from "@/lib/admin/moysklad";
import { catalogProductImageRenderProps } from "@/lib/store/product-image";

type AdminCatalogTableProps = {
  products: AdminProduct[];
  canWrite: boolean;
  listParams: AdminCatalogListParams;
  categoryNames: Map<string, string> | null;
  searchQuery?: string;
};

function buildColumns(
  canWrite: boolean,
  listParams: AdminCatalogListParams,
  categoryNames: Map<string, string> | null,
): AdminDataTableColumn<AdminProduct>[] {
  const columns: AdminDataTableColumn<AdminProduct>[] = [
    {
      id: "photo",
      header: "Фото",
      cell: (product) => {
        const image = catalogProductImageRenderProps({
          slug: product.slug,
          imageUrl: product.image_url,
          erpImageUrl: product.erp_image_url,
        });
        return (
          <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
            <Image
              src={image.src}
              alt={product.name}
              fill
              className="object-cover"
              unoptimized={image.unoptimized}
              placeholder={image.placeholder}
              blurDataURL={image.blurDataURL}
            />
          </div>
        );
      },
    },
    {
      id: "name",
      header: "Название",
      sortValue: (product) => product.name,
      cell: (product) => (
        <div className="flex flex-wrap items-center gap-2 font-medium">
          {product.name}
          {isMoySkladSynced(product.sync_source) ? <MoySkladBadge /> : null}
        </div>
      ),
    },
    {
      id: "slug",
      header: "Slug",
      sortValue: (product) => product.slug,
      defaultHidden: true,
      cell: (product) => <span className="text-muted-foreground">{product.slug}</span>,
    },
    {
      id: "status",
      header: "Статус",
      sortValue: (product) => product.status,
      cell: (product) => PRODUCT_STATUS_LABELS[product.status] ?? product.status,
    },
    {
      id: "category",
      header: "Категория",
      sortValue: (product) => getProductCategoryName(product.category_id, categoryNames),
      cell: (product) => (
        <span className="text-muted-foreground">
          {getProductCategoryName(product.category_id, categoryNames)}
        </span>
      ),
    },
    {
      id: "retail",
      header: "Розница",
      sortValue: (product) => getAdminProductListPrices(product).retailCents,
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (product) => {
        const { retailCents } = getAdminProductListPrices(product);
        return formatPrice(retailCents, product.currency);
      },
    },
    {
      id: "wholesale",
      header: "Опт",
      sortValue: (product) => getAdminProductListPrices(product).wholesaleCents ?? -1,
      cellClassName: "text-right",
      headerClassName: "text-right",
      defaultHidden: true,
      cell: (product) => {
        const { wholesaleCents } = getAdminProductListPrices(product);
        return wholesaleCents != null ? formatPrice(wholesaleCents, product.currency) : "—";
      },
    },
    {
      id: "stock",
      header: "Остаток (МС)",
      sortValue: (product) => product.stock_available_total ?? 0,
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (product) => <AdminProductStock product={product} />,
    },
  ];

  if (canWrite) {
    columns.push({
      id: "actions",
      header: "Действия",
      cell: (product) => (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={buildAdminCatalogEditHref(product.id, listParams)}
            className="text-primary hover:underline"
          >
            Изменить
          </Link>
          <AdminProductHideButton productId={product.id} hidden={product.status === "archived"} />
        </div>
      ),
    });
  }

  return columns;
}

export function AdminCatalogTable({
  products,
  canWrite,
  listParams,
  categoryNames,
  searchQuery,
}: AdminCatalogTableProps) {
  return (
    <AdminDataTable
      tableId="admin-catalog-products"
      columns={buildColumns(canWrite, listParams, categoryNames)}
      rows={products}
      getRowId={(product) => product.id}
      stickyHeader
      density="compact"
      emptyState={
        <AdminEmptyState
          title={searchQuery ? "Ничего не найдено" : "Нет товаров из МойСклад"}
          description={
            searchQuery
              ? "Попробуйте изменить поисковый запрос или сбросить фильтры."
              : "Запустите импорт на странице интеграции МойСклад."
          }
          action={
            searchQuery
              ? undefined
              : { label: "Интеграция МойСклад", href: "/admin/integrations/moysklad" }
          }
        />
      }
      renderMobileCard={(product) => {
        const image = catalogProductImageRenderProps({
          slug: product.slug,
          imageUrl: product.image_url,
          erpImageUrl: product.erp_image_url,
        });
        return (
          <AdminMobileCard key={product.id}>
            <div className="flex gap-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                <Image
                  src={image.src}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized={image.unoptimized}
                  placeholder={image.placeholder}
                  blurDataURL={image.blurDataURL}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-medium leading-snug">{product.name}</p>
                {isMoySkladSynced(product.sync_source) ? <MoySkladBadge /> : null}
                <AdminMobileCardRow label="Slug">
                  <span className="break-all font-normal text-muted-foreground">{product.slug}</span>
                </AdminMobileCardRow>
                <AdminMobileCardRow label="Статус">
                  {PRODUCT_STATUS_LABELS[product.status] ?? product.status}
                </AdminMobileCardRow>
                <AdminMobileCardRow label="Категория">
                  {getProductCategoryName(product.category_id, categoryNames)}
                </AdminMobileCardRow>
                <AdminMobileCardRow label="Розница">
                  <AdminProductPrices product={product} compact />
                </AdminMobileCardRow>
                <AdminMobileCardRow label="Остаток (МС)">
                  <AdminProductStock product={product} />
                </AdminMobileCardRow>
                {canWrite ? (
                  <>
                    <Link
                      href={buildAdminCatalogEditHref(product.id, listParams)}
                      className="inline-flex text-sm font-medium text-primary hover:underline"
                    >
                      Изменить
                    </Link>
                    <AdminProductHideButton
                      productId={product.id}
                      hidden={product.status === "archived"}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </AdminMobileCard>
        );
      }}
    />
  );
}
