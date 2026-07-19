"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  addProductImageAction,
  deleteProductImageAction,
  updateProductImageAction,
  uploadAdminMediaAction,
} from "@/app/actions/admin-catalog";
import { useToast } from "@/components/store/ui/toast-provider";
import { Button } from "@/components/ui/button";
import type { ProductImage } from "@/lib/admin/catalog-shared";
import { getSwatchStyle } from "@/lib/store/color-swatch";

const selectClass =
  "h-8 w-full min-w-[10rem] rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminProductGalleryProps = {
  productId: string;
  images: ProductImage[];
  erpImageUrl?: string | null;
  colorOptions?: string[];
};

function ColorSwatch({ label }: { label: string }) {
  return (
    <span
      className="inline-block size-4 shrink-0 rounded-full border border-border/60"
      style={getSwatchStyle(label)}
      aria-hidden
    />
  );
}

function ImageColorSelect({
  image,
  productId,
  colorOptions,
  disabled,
  onUpdated,
}: {
  image: ProductImage;
  productId: string;
  colorOptions: string[];
  disabled: boolean;
  onUpdated: () => void;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleChange(nextColor: string) {
    startTransition(async () => {
      const result = await updateProductImageAction(image.id, productId, {
        option_color: nextColor || null,
      });
      if (result.error) {
        showToast(result.error);
        return;
      }
      showToast("Цвет фото обновлён");
      onUpdated();
    });
  }

  if (colorOptions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Нет вариантов с цветом — привязка недоступна.
      </p>
    );
  }

  return (
    <label className="flex min-w-[12rem] flex-col gap-1 text-xs">
      <span className="font-medium text-muted-foreground">Цвет на витрине</span>
      <div className="flex items-center gap-2">
        {image.option_color ? <ColorSwatch label={image.option_color} /> : null}
        <select
          className={selectClass}
          value={image.option_color ?? ""}
          disabled={disabled || pending}
          onChange={(event) => handleChange(event.target.value)}
          aria-label={`Цвет для фото ${image.sort_order + 1}`}
        >
          <option value="">Общее фото</option>
          {colorOptions.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

export function AdminProductGallery({
  productId,
  images,
  erpImageUrl,
  colorOptions = [],
}: AdminProductGalleryProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadColor, setUploadColor] = useState("");
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
      const result = await addProductImageAction(
        productId,
        upload.url,
        images.length,
        uploadColor || null,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setUploadColor("");
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
      const result = await addProductImageAction(
        productId,
        erpImageUrl,
        images.length,
        uploadColor || null,
      );
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
          Дополнительные фото для витрины. Привяжите фото к цвету — на карточке товара галерея
          переключится при выборе цвета. Без привязки фото показывается для всех вариантов.
        </p>
      </div>

      {colorOptions.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-dashed border-border/80 bg-muted/20 p-3">
          <label className="flex min-w-[12rem] flex-col gap-1 text-xs">
            <span className="font-medium text-muted-foreground">Цвет для новых фото</span>
            <select
              className={selectClass}
              value={uploadColor}
              onChange={(event) => setUploadColor(event.target.value)}
              disabled={pending}
            >
              <option value="">Общее фото</option>
              {colorOptions.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Варианты: {colorOptions.join(", ")}
          </p>
        </div>
      ) : null}

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
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleUseErpPlaceholder}
          >
            Добавить в галерею
          </Button>
        </div>
      ) : null}

      {images.length > 0 ? (
        <ul className="space-y-3">
          {images.map((image) => (
            <li
              key={image.id}
              className="flex flex-wrap items-start gap-3 rounded-md border border-border/60 p-3"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                <Image src={image.url} alt="" fill className="object-cover" unoptimized />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-xs text-muted-foreground">{image.url}</p>
                <p className="text-xs text-muted-foreground">Порядок: {image.sort_order}</p>
                <ImageColorSelect
                  image={image}
                  productId={productId}
                  colorOptions={colorOptions}
                  disabled={pending}
                  onUpdated={refresh}
                />
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
