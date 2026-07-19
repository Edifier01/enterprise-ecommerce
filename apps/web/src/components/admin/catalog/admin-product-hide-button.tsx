"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { hideProductAction } from "@/app/actions/admin-moysklad";
import { Button } from "@/components/ui/button";

type AdminProductHideButtonProps = {
  productId: string;
  hidden?: boolean;
};

export function AdminProductHideButton({
  productId,
  hidden = false,
}: AdminProductHideButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (hidden) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await hideProductAction(productId);
          router.refresh();
        })
      }
    >
      Скрыть с витрины
    </Button>
  );
}
