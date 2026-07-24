"use client";

import { useCallback, useEffect, useState } from "react";

import { subscribeCartUpdated } from "@/lib/checkout/cart-events";
import { getCart, type Cart } from "@/lib/checkout/api";
import { formatPrice } from "@/lib/store/format";

type CartSummary = {
  itemCount: number;
  totalLabel: string;
  cart: Cart | null;
  refresh: () => void;
};

const EMPTY_SUMMARY: Omit<CartSummary, "refresh"> = {
  itemCount: 0,
  totalLabel: formatPrice(0, "RUB"),
  cart: null,
};

export function useCartSummary(): CartSummary {
  const [summary, setSummary] = useState<Omit<CartSummary, "refresh">>(EMPTY_SUMMARY);

  const refresh = useCallback(() => {
    getCart()
      .then((cart) => {
        const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
        const currency = cart.currency ?? cart.lines[0]?.currency ?? "RUB";
        setSummary({
          itemCount: count,
          totalLabel: formatPrice(cart.total_cents, currency),
          cart,
        });
      })
      .catch(() => {
        setSummary(EMPTY_SUMMARY);
      });
  }, []);

  useEffect(() => {
    refresh();
    return subscribeCartUpdated(refresh);
  }, [refresh]);

  return { ...summary, refresh };
}
