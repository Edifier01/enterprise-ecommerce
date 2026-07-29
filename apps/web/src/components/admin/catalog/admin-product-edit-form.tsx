"use client";



import Link from "next/link";

import { useActionState, useEffect, useRef } from "react";



import {

  updateProductAction,

  type CatalogActionState,

} from "@/app/actions/admin-catalog";

import { AdminFormSection } from "@/components/admin/admin-form-section";

import { AdminCategorySelect } from "@/components/admin/catalog/admin-category-select";

import { AdminImageField } from "@/components/admin/catalog/admin-image-field";

import { AdminProductGallery } from "@/components/admin/catalog/admin-product-gallery";

import { AdminSeoFields } from "@/components/admin/catalog/admin-seo-fields";

import { AdminVariantPanel } from "@/components/admin/catalog/admin-variant-panel";

import { MoySkladProductBanner } from "@/components/admin/moysklad/moysklad-product-banner";

import { useToast } from "@/components/store/ui/toast-provider";

import { Button } from "@/components/ui/button";

import type { AdminCategory, AdminProduct } from "@/lib/admin/catalog-shared";

import { formatPrice, getDefaultAdminVariant } from "@/lib/admin/catalog-shared";

import { centsToRubles } from "@/lib/admin/money";

import { isMoySkladSynced } from "@/lib/admin/moysklad";

import { getColorOptionsFromVariants } from "@/lib/store/variant-options";



const inputClass =

  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";



const textareaClass =

  "min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";



const readOnlyClass =

  "h-9 w-full rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground";



function FieldError({

  fieldErrors,

  name,

}: {

  fieldErrors?: Record<string, string>;

  name: string;

}) {

  const message = fieldErrors?.[name];

  if (!message) return null;

  return (

    <p className="text-xs text-destructive" role="alert">

      {message}

    </p>

  );

}



type AdminProductEditFormProps = {

  product: AdminProduct;

  categories: AdminCategory[];

  returnTo?: string;

};



export function AdminProductEditForm({

  product,

  categories,

  returnTo = "/admin/catalog",

}: AdminProductEditFormProps) {

  const boundAction = updateProductAction.bind(null, product.id);

  const [state, formAction, pending] = useActionState<CatalogActionState, FormData>(

    boundAction,

    {},

  );

  const { showToast } = useToast();

  const lastSuccessRef = useRef(false);



  useEffect(() => {

    if (state.success && !lastSuccessRef.current) {

      showToast({ tone: "success", message: "Товар сохранён" });

    }

    lastSuccessRef.current = Boolean(state.success);

  }, [state.success, showToast]);



  const msSynced = isMoySkladSynced(product.sync_source);

  const defaultVariant = getDefaultAdminVariant(product);

  const colorOptions = getColorOptionsFromVariants(

    product.variants.map((variant) => ({

      id: variant.id,

      sku: variant.sku,

      name: variant.name,

      price_cents: variant.price_cents,

      wholesale_price_cents: variant.wholesale_price_cents ?? undefined,

      in_stock: variant.in_stock,

      is_default: variant.is_default,

      sort_order: variant.sort_order,

      attributes: variant.attributes ?? {},

    })),

  );



  return (

    <div className="space-y-6">

      <MoySkladProductBanner product={product} />



      {product.status === "active" && product.category_id ? (

        <p className="text-sm">

          <a

            href={`/products/${product.slug}`}

            target="_blank"

            rel="noopener noreferrer"

            className="font-medium text-primary underline-offset-4 hover:underline"

          >

            Посмотреть на витрине ↗

          </a>

        </p>

      ) : (

        <p className="text-sm text-muted-foreground">

          Превью на витрине доступно после назначения категории и публикации (статус «Активен»).

        </p>

      )}



      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">

        <div className="space-y-6">

          <AdminFormSection

            title="Галерея"

            description="Фото для витрины и привязка к цветам вариантов."

          >

            <AdminProductGallery

              productId={product.id}

              productSlug={product.slug}

              images={product.images ?? []}

              erpImageUrl={product.erp_image_url}

              colorOptions={colorOptions}

              embedded

            />

          </AdminFormSection>



          {msSynced ? (

            <AdminFormSection

              title="Данные из МойСклад"

              description="Цены и остатки синхронизируются из ERP и не редактируются здесь."

            >

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="flex flex-col gap-2">

                  <span className="text-sm font-medium">Розница, ₽</span>

                  <div className={readOnlyClass}>

                    {formatPrice(product.price_cents, product.currency)}

                  </div>

                </div>

                <div className="flex flex-col gap-2">

                  <span className="text-sm font-medium">Опт, ₽</span>

                  <div className={readOnlyClass}>

                    {defaultVariant?.wholesale_price_cents != null

                      ? formatPrice(defaultVariant.wholesale_price_cents, product.currency)

                      : "—"}

                  </div>

                </div>

              </div>

            </AdminFormSection>

          ) : null}

        </div>



        <form id="admin-product-form" action={formAction} className="space-y-6">

          <input type="hidden" name="sync_source" value={product.sync_source} />

          <input type="hidden" name="return_to" value={returnTo} />



          <AdminFormSection title="Основное" description="Название, категория и параметры витрины.">

            <div className="grid gap-4 sm:grid-cols-2">

              <div className="flex flex-col gap-2 sm:col-span-2">

                <label htmlFor="name" className="text-sm font-medium">

                  Название (витрина)

                </label>

                <input

                  id="name"

                  name="name"

                  defaultValue={product.name}

                  required

                  className={inputClass}

                />

                <FieldError fieldErrors={state.fieldErrors} name="name" />

              </div>

              <div className="flex flex-col gap-2">

                <label htmlFor="slug" className="text-sm font-medium">

                  Slug

                </label>

                <input

                  id="slug"

                  name="slug"

                  defaultValue={product.slug}

                  required

                  className={inputClass}

                />

                <FieldError fieldErrors={state.fieldErrors} name="slug" />

              </div>

              <div className="flex flex-col gap-2">

                <label htmlFor="status" className="text-sm font-medium">

                  Статус

                </label>

                <select

                  id="status"

                  name="status"

                  key={`${product.id}-${product.status}`}

                  defaultValue={product.status}

                  className={inputClass}

                >

                  <option value="draft">Черновик</option>

                  <option value="active">Активен</option>

                  <option value="archived">Архив</option>

                </select>

              </div>

              {!msSynced ? (

                <div className="flex flex-col gap-2">

                  <label htmlFor="price_rub" className="text-sm font-medium">

                    Розница, ₽

                  </label>

                  <input

                    id="price_rub"

                    name="price_rub"

                    type="number"

                    min={0}

                    step={1}

                    defaultValue={centsToRubles(product.price_cents)}

                    required

                    className={inputClass}

                  />

                </div>

              ) : null}

              {!msSynced ? (

                <div className="flex flex-col gap-2 sm:col-span-2">

                  <span className="text-sm font-medium">Опт, ₽</span>

                  <p className="text-sm text-muted-foreground">

                    Укажите оптовую цену в блоке вариантов ниже.

                  </p>

                </div>

              ) : null}

              <div className="flex flex-col gap-2">

                <label htmlFor="compare_at_price_rub" className="text-sm font-medium">

                  Старая цена, ₽

                </label>

                <input

                  id="compare_at_price_rub"

                  name="compare_at_price_rub"

                  type="number"

                  min={0}

                  step={1}

                  defaultValue={

                    product.compare_at_price_cents != null

                      ? centsToRubles(product.compare_at_price_cents)

                      : ""

                  }

                  className={inputClass}

                />

              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">

                <label htmlFor="category_id" className="text-sm font-medium">

                  Категория

                </label>

                <AdminCategorySelect

                  id="category_id"

                  categories={categories}

                  defaultValue={product.category_id ?? ""}

                />

              </div>

              <div className="sm:col-span-2">

                <AdminImageField defaultValue={product.image_url ?? ""} />

                <FieldError fieldErrors={state.fieldErrors} name="image_url" />

              </div>

            </div>

          </AdminFormSection>



          <AdminFormSection

            title="Описание"

            description="Текст карточки товара. Переносы строк сохраняются на витрине."

          >

            <label htmlFor="description" className="sr-only">

              Описание

            </label>

            <textarea

              id="description"

              name="description"

              defaultValue={product.description ?? ""}

              className={textareaClass}

            />

            <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line">

              Совет: используйте абзацы через Enter — на витрине текст отображается с переносами

              строк.

            </p>

          </AdminFormSection>



          <AdminFormSection title="SEO" description="Заголовок и описание для поисковых систем.">

            <AdminSeoFields

              metaTitle={product.meta_title}

              metaDescription={product.meta_description}

              embedded

            />

          </AdminFormSection>



          {state.error && (

            <p className="text-sm text-destructive" role="alert">

              {state.error}

            </p>

          )}

        </form>

      </div>



      <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-0 sm:rounded-lg sm:border md:sticky md:top-4 md:bottom-auto">

        <div className="flex flex-wrap gap-3">

          <Button type="submit" form="admin-product-form" name="intent" value="stay" disabled={pending}>

            {pending ? "Сохранение..." : "Сохранить"}

          </Button>

          <Button

            type="submit"

            form="admin-product-form"

            name="intent"

            value="close"

            variant="outline"

            disabled={pending}

          >

            Сохранить и закрыть

          </Button>

          <Link

            href={returnTo}

            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"

          >

            Отмена

          </Link>

        </div>

      </div>



      <AdminVariantPanel product={product} />

    </div>

  );

}


