"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { useCartSummary } from "@/lib/checkout/use-cart-summary";
import { cn } from "@/lib/utils";

export function CartHeaderSummary() {
  const { itemCount, totalLabel } = useCartSummary();

  return (
    <Link
      href="/cart"
      className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground transition-colors hover:text-primary sm:text-sm"
      aria-label={`Корзина: ${itemCount} товаров, ${totalLabel}`}
    >
      <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <ShoppingCart className="size-4" aria-hidden />
        {itemCount > 0 ? (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full",
              "bg-destructive px-1 text-[10px] font-bold leading-5 text-destructive-foreground",
            )}
            aria-hidden
          >
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        ) : null}
      </span>
      <span className="hidden sm:inline">
        Товаров {itemCount} ({totalLabel})
      </span>
    </Link>
  );
}
