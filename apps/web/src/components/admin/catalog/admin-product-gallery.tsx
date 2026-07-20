"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

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

function ImageAltTextField({
  image,
  productId,
  disabled,
  onUpdated,
}: {
  image: ProductImage;
  productId: string;
  disabled: boolean;
  onUpdated: () => void;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(image.alt_text ?? "");

  function handleBlur() {
    const next = value.trim() || null;
    if (next === (image.alt_text ?? null)) return;
    startTransition(async () => {
      const result = await updateProductImageAction(image.id, productId, { alt_text: next });
      if (result.error) {
        showToast(result.error);
        return;
      }
      showToast("Alt-текст сохранён");
      onUpdated();
    });
  }

  return (
    <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
      <span className="font-medium text-muted-foreground">Alt-текст (SEO)</span>
      <input
        type="text"
        className={selectClass}
        value={value}
        disabled={disabled || pending}
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleBlur}
        placeholder="Описание фото для поисковиков"
        aria-label={`Alt-текст для фото ${image.sort_order + 1}`}
      />
    </label>
  );
}

function ColorCoveragePanel({
  colors,
  tagged,
  missing,
}: {
  colors: string[];
  tagged: string[];
  missing: string[];
}) {
  if (colors.length < 2) return null;

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/20 p-3">
      <p className="text-sm font-medium">Покрытие цветов в галерее</p>
      <ul className="flex flex-wrap gap-2 text-xs">
        {colors.map((color) => {
          const covered = tagged.includes(color);
          return (
            <li
              key={color}
              className={
                covered
                  ? "inline-flex items-center gap-1.5 rounded-full border border-green-600/30 bg-green-50 px-2 py-1 text-green-800 dark:bg-green-950/30 dark:text-green-200"
                  : "inline-flex items-center gap-1.5 rounded-full border border-amber-600/30 bg-amber-50 px-2 py-1 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
              }
            >
              <ColorSwatch label={color} />
              {color}
              <span aria-hidden>{covered ? "✓" : "✗"}</span>
            </li>
          );
        })}
      </ul>
      {missing.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Нет фото для: {missing.join(", ")}. Привяжите или добавьте placeholder из МойСклад.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Все цвета покрыты фото в галерее.</p>
      )}
    </div>
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
  const { showToast } = useToast();

  const sortedImages = useMemo(
    () => [...images].sort((a, b) => a.sort_order - b.sort_order),
    [images],
  );

  const coverageFromOptions = useMemo(() => {
    const tagged = [
      ...new Set(
        sortedImages
          .map((image) => image.option_color)
          .filter((color): color is string => Boolean(color)),
      ),
    ];
    const missing = colorOptions.filter((color) => !tagged.includes(color));
    return { colors: colorOptions, tagged, missing };
  }, [colorOptions, sortedImages]);

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
        sortedImages.length,
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

  function handleUseErpPlaceholder(optionColor?: string | null) {
    if (!erpImageUrl) return;
    setError(null);
    startTransition(async () => {
      const result = await addProductImageAction(
        productId,
        erpImageUrl,
        sortedImages.length,
        optionColor ?? uploadColor || null,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleAddPlaceholdersForMissingColors() {
    if (!erpImageUrl || coverageFromOptions.missing.length === 0) return;
    setError(null);
    startTransition(async () => {
      let added = 0;
      let sortOrder = sortedImages.length;
      for (const color of coverageFromOptions.missing) {
        const alreadyHas = sortedImages.some(
          (image) => image.url === erpImageUrl && image.option_color === color,
        );
        if (alreadyHas) continue;
        const result = await addProductImageAction(productId, erpImageUrl, sortOrder, color);
        sortOrder += 1;
        if (!result.error) added += 1;
      }
      if (added > 0) {
        showToast(`Добавлено placeholder-фото: ${added}`);
        refresh();
      } else {
        setError("Не удалось добавить placeholder-фото.");
      }
    });
  }

  function handleMove(image: ProductImage, direction: "up" | "down") {
    const index = sortedImages.findIndex((item) => item.id === image.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= sortedImages.length) return;

    const other = sortedImages[swapIndex];
    setError(null);
    startTransition(async () => {
      const first = await updateProductImageAction(image.id, productId, {
        sort_order: other.sort_order,
      });
      if (first.error) {
        setError(first.error);
        return;
      }
      const second = await updateProductImageAction(other.id, productId, {
        sort_order: image.sort_order,
      });
      if (second.error) {
        setError(second.error);
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

      <ColorCoveragePanel
        colors={coverageFromOptions.colors}
        tagged={coverageFromOptions.tagged}
        missing={coverageFromOptions.missing}
      />

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
          <p className="text-xs text-muted-foreground">Варианты: {colorOptions.join(", ")}</p>
        </div>
      ) : null}

      {erpImageUrl && coverageFromOptions.missing.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed p-3">
          <div className="relative size-16 overflow-hidden rounded-md border bg-muted">
            <Image src={erpImageUrl} alt="" fill className="object-cover" unoptimized />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium">Placeholder из МойСклад</p>
            <p className="text-xs text-muted-foreground">
              Добавить фото MS для цветов без галереи: {coverageFromOptions.missing.join(", ")}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleAddPlaceholdersForMissingColors}
          >
            Добавить для всех цветов
          </Button>
        </div>
      ) : null}

      {erpImageUrl && !sortedImages.some((img) => img.url === erpImageUrl) ? (
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
            onClick={() => handleUseErpPlaceholder()}
          >
            Добавить в галерею
          </Button>
        </div>
      ) : null}

      {sortedImages.length > 0 ? (
        <ul className="space-y-3">
          {sortedImages.map((image, index) => (
            <li
              key={image.id}
              className="flex flex-wrap items-start gap-3 rounded-md border border-border/60 p-3"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                <Image src={image.url} alt="" fill className="object-cover" unoptimized />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-xs text-muted-foreground">{image.url}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">Порядок: {image.sort_order}</p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending || index === 0}
                      onClick={() => handleMove(image, "up")}
                      aria-label="Выше"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending || index === sortedImages.length - 1}
                      onClick={() => handleMove(image, "down")}
                      aria-label="Ниже"
                    >
                      ↓
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ImageColorSelect
                    image={image}
                    productId={productId}
                    colorOptions={colorOptions}
                    disabled={pending}
                    onUpdated={refresh}
                  />
                  <ImageAltTextField
                    image={image}
                    productId={productId}
                    disabled={pending}
                    onUpdated={refresh}
                  />
                </div>
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
