"use client";

import { useCallback, useEffect, useState } from "react";

import { subscribeCartUpdated } from "@/lib/checkout/cart-events";
import { getCart } from "@/lib/checkout/api";
import { formatPrice } from "@/lib/store/format";

type CartSummary = {
  itemCount: number;
  totalLabel: string;
};

const EMPTY_SUMMARY: CartSummary = {
  itemCount: 0,
  totalLabel: formatPrice(0, "RUB"),
};

export function useCartSummary(): CartSummary {
  const [summary, setSummary] = useState<CartSummary>(EMPTY_SUMMARY);

  const refresh = useCallback(() => {
    getCart()
      .then((cart) => {
        const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
        const currency = cart.currency ?? cart.lines[0]?.currency ?? "RUB";
        setSummary({
          itemCount: count,
          totalLabel: formatPrice(cart.total_cents, currency),
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

  return summary;
}
