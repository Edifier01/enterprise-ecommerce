"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  addProductImageAction,
  deleteProductImageAction,
  uploadAdminMediaAction,
} from "@/app/actions/admin-catalog";
import { Button } from "@/components/ui/button";
import type { ProductImage } from "@/lib/admin/catalog";

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminProductGalleryProps = {
  productId: string;
  images: ProductImage[];
  erpImageUrl?: string | null;
};

export function AdminProductGallery({
  productId,
  images,
  erpImageUrl,
}: AdminProductGalleryProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleUpload(file: File) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const upload = await uploadAdminMediaAction(formData);
      if (!upload.ok) {
        setError(upload.error);
        return;
      }
      const result = await addProductImageAction(productId, upload.url, images.length);
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleDelete(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteProductImageAction(imageId, productId);
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleUseErpPlaceholder() {
    if (!erpImageUrl) return;
    setError(null);
    startTransition(async () => {
      const result = await addProductImageAction(productId, erpImageUrl, images.length);
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <p className="font-medium">Галерея</p>
        <p className="text-xs text-muted-foreground">
          Дополнительные фото для витрины. Основное фото — поле «URL изображения» выше.
        </p>
      </div>

      {erpImageUrl && !images.some((img) => img.url === erpImageUrl) ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed p-3">
          <div className="relative size-16 overflow-hidden rounded-md border bg-muted">
            <Image src={erpImageUrl} alt="" fill className="object-cover" unoptimized />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium">Фото из МойСклад (placeholder)</p>
            <p className="text-xs text-muted-foreground">
              Можно добавить в галерею как стартовое изображение.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={handleUseErpPlaceholder}>
            Добавить в галерею
          </Button>
        </div>
      ) : null}

      {images.length > 0 ? (
        <ul className="space-y-3">
          {images.map((image) => (
            <li
              key={image.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 p-3"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                <Image src={image.url} alt="" fill className="object-cover" unoptimized />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">{image.url}</p>
                <p className="text-xs text-muted-foreground">Порядок: {image.sort_order}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => handleDelete(image.id)}
              >
                Удалить
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Галерея пуста.</p>
      )}

      <div className="space-y-2">
        <label className="flex flex-col gap-1 text-sm">
          URL изображения
          <input name="gallery_url" className={inputClass} placeholder="https://…" disabled />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUpload(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            {pending ? "Загрузка…" : "Загрузить в галерею"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
