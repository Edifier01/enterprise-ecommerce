import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/store/layout/page-container";
import {
  getOrder,
  getOrderStatusLabel,
} from "@/lib/orders";
import { formatPrice } from "@/lib/store/format";
import { siteConfig } from "@/lib/store/site-config";

type AccountOrderDetailPageProps = {
  orderNumber: string;
};

export async function AccountOrderDetailPage({
  orderNumber,
}: AccountOrderDetailPageProps) {
  let order: Awaited<ReturnType<typeof getOrder>> | null = null;

  try {
    order = await getOrder(orderNumber);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  return (
    <PageContainer as="main" className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/account/orders" className="hover:underline">
            ← Мои заказы
          </Link>
        </p>
        <h1 className="store-section-title">{order.order_number}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(order.created_at).toLocaleString(siteConfig.locale)} ·{" "}
          {getOrderStatusLabel(order.status)}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Состав заказа</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y">
            {order.lines.map((line) => (
              <li
                key={line.id}
                className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{line.product_snapshot.product_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {line.product_snapshot.name} · {line.product_snapshot.sku}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Количество: {line.quantity}
                  </p>
                </div>
                <p className="font-medium">
                  {formatPrice(line.line_total_cents, line.product_snapshot.currency)}
                </p>
              </li>
            ))}
          </ul>

          <div className="border-t pt-4 text-right">
            <p className="text-sm text-muted-foreground">Итого</p>
            <p className="text-lg font-semibold">
              {formatPrice(order.total_cents, order.currency)}
            </p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
