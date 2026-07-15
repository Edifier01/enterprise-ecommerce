"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";

import { getCart } from "@/lib/checkout/api";
import { formatPrice } from "@/lib/store/format";

export function CartHeaderSummary() {
  const [itemCount, setItemCount] = useState(0);
  const [totalLabel, setTotalLabel] = useState("0 ₽");

  useEffect(() => {
    let mounted = true;

    getCart()
      .then((cart) => {
        if (!mounted) return;

        const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
        const currency = cart.currency ?? cart.lines[0]?.currency ?? "RUB";
        setItemCount(count);
        setTotalLabel(formatPrice(cart.total_cents, currency));
      })
      .catch(() => {
        if (mounted) {
          setItemCount(0);
          setTotalLabel(formatPrice(0, "RUB"));
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground transition-colors hover:text-primary sm:text-sm"
      aria-label={`Корзина: ${itemCount} товаров, ${totalLabel}`}
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <ShoppingCart className="size-4" aria-hidden />
      </span>
      <span className="hidden sm:inline">
        Товаров {itemCount} ({totalLabel})
      </span>
    </Link>
  );
}
