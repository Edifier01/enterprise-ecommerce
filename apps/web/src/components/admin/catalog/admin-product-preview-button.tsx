"use client";

import { useTransition } from "react";

import { createProductPreviewTokenAction } from "@/app/actions/admin-catalog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/store/ui/toast-provider";

type AdminProductPreviewButtonProps = {
  productId: string;
  slug: string;
  className?: string;
};

export function AdminProductPreviewButton({
  productId,
  slug,
  className,
}: AdminProductPreviewButtonProps) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();

  function openPreview() {
    startTransition(async () => {
      const result = await createProductPreviewTokenAction(productId);
      if (!result.ok) {
        showToast({ tone: "error", message: result.error });
        return;
      }
      const url = `/products/${result.slug}?preview=${encodeURIComponent(result.token)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={pending || !slug.trim()}
      onClick={openPreview}
    >
      {pending ? "Открываем…" : "Предпросмотр на витрине ↗"}
    </Button>
  );
}
