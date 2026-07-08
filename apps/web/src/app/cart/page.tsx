import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/store/layout/page-container";
import { getProduct } from "@/lib/api";

export const metadata: Metadata = {
  title: "Корзина",
  description: "Корзина покупок",
};

interface CartPageProps {
  searchParams: Promise<{ add?: string }>;
}

export default async function CartPage({ searchParams }: CartPageProps) {
  const { add } = await searchParams;

  let addedProductName: string | null = null;

  if (add) {
    try {
      const product = await getProduct(add);
      addedProductName = product.name;
    } catch {
      addedProductName = null;
    }
  }

  return (
    <PageContainer as="div" className="space-y-6">
      <header className="space-y-2">
        <h1 className="store-section-title">Корзина</h1>
      </header>

      {add ? (
        <div
          role="status"
          className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground"
        >
          {addedProductName ? (
            <>
              «{addedProductName}» будет добавлен в корзину после подключения сервиса
              оформления заказа.
            </>
          ) : (
            <>Товар будет добавлен в корзину после подключения сервиса оформления заказа.</>
          )}
        </div>
      ) : null}

      <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/20 px-6 py-16 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <ShoppingCart className="size-8 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Корзина пуста</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Добавьте товары из каталога. Полноценное оформление заказа появится в следующих
          обновлениях.
        </p>
        <Button
          size="lg"
          className="mt-6 bg-store-cta text-store-cta-foreground hover:bg-store-cta/90"
          render={<Link href="/catalog" />}
        >
          Перейти в каталог
        </Button>
      </div>
    </PageContainer>
  );
}
