"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/store/ui/toast-provider";
import { dispatchCartUpdated } from "@/lib/checkout/cart-events";
import { addCartLine } from "@/lib/checkout/api";
import { cn } from "@/lib/utils";

export interface AddToCartButtonProps {
  variantId: string;
  productName: string;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
  pendingLabel?: string;
}

export function AddToCartButton({
  variantId,
  productName,
  disabled = false,
  size = "sm",
  className,
  label = "Купить",
  pendingLabel = "Добавляем...",
}: AddToCartButtonProps) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await addCartLine(variantId, 1);
        dispatchCartUpdated();
        showToast(`«${productName}» добавлен в корзину`, {
          label: "Перейти в корзину",
          href: "/cart",
        });
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Не удалось добавить товар в корзину",
        );
      }
    });
  }

  return (
    <Button
      type="button"
      size={size}
      disabled={disabled || isPending}
      className={cn(
        "bg-store-cta text-store-cta-foreground hover:bg-store-cta/90 disabled:opacity-50",
        className,
      )}
      onClick={handleClick}
    >
      {isPending ? pendingLabel : label}
    </Button>
  );
}
