import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/store/layout/page-container";
import { getOrderStatusLabel, listOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/store/format";
import { siteConfig } from "@/lib/store/site-config";

export async function AccountOrdersPage() {
  let orders: Awaited<ReturnType<typeof listOrders>> | null = null;
  let error: string | null = null;

  try {
    orders = await listOrders();
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_AUTHENTICATED") {
      error = "Требуется авторизация.";
    } else {
      error = "Не удалось загрузить заказы. Убедитесь, что API запущен и доступен.";
    }
  }

  return (
    <PageContainer as="main" className="space-y-6">
      <header className="space-y-2">
        <h1 className="store-section-title">Мои заказы</h1>
        <p className="text-sm text-muted-foreground">
          История оформленных покупок в вашем аккаунте.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {orders && orders.items.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              У вас пока нет заказов.
            </p>
            <Button variant="outline" size="sm" render={<Link href="/catalog" />}>
              Перейти в каталог
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {orders && orders.items.length > 0 ? (
        <ul className="space-y-4">
          {orders.items.map((order) => (
            <li key={order.id}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      <Link
                        href={`/account/orders/${encodeURIComponent(order.order_number)}`}
                        className="hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleString(siteConfig.locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatPrice(order.total_cents, order.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getOrderStatusLabel(order.status)}
                    </p>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        href="/account"
        className="inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        ← Назад в профиль
      </Link>
    </PageContainer>
  );
}
