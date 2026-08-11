"use client";

import Image from "next/image";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { getSwatchStyle } from "@/lib/store/color-swatch";
import { erpImageProxyPath, productImageRenderProps, resolveProductGalleryImageSrc } from "@/lib/store/product-image";
import { cn } from "@/lib/utils";

type GalleryImage = {
  id: string;
  url: string;
  option_color?: string | null;
};

type AdminGalleryColorMatrixProps = {
  productSlug: string;
  colors: string[];
  missing: string[];
  images: GalleryImage[];
  erpImageUrl?: string | null;
  pending?: boolean;
  onUploadForColor: (color: string) => void;
  onAddErpPlaceholder: (color: string) => void;
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

export function AdminGalleryColorMatrix({
  productSlug,
  colors,
  missing,
  images,
  erpImageUrl,
  pending = false,
  onUploadForColor,
  onAddErpPlaceholder,
}: AdminGalleryColorMatrixProps) {
  const [, startTransition] = useTransition();

  if (colors.length < 2) return null;

  const erpPreview = erpImageUrl ? productImageRenderProps(erpImageProxyPath(productSlug)) : null;

  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-muted/20 p-3"
      aria-label="Матрица цветов галереи"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">Матрица цветов</p>
        <p className="text-xs text-muted-foreground">
          У каждого цвета должно быть хотя бы одно фото в галерее перед публикацией.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Цвет</th>
              <th className="pb-2 pr-3 font-medium">Статус</th>
              <th className="pb-2 pr-3 font-medium">Фото</th>
              <th className="pb-2 font-medium">Действие</th>
            </tr>
          </thead>
          <tbody>
            {colors.map((color) => {
              const colorImages = images.filter((image) => image.option_color === color);
              const covered = !missing.includes(color);
              const previewImage = colorImages[0];

              return (
                <tr key={color} className="border-b border-border/60 last:border-b-0">
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <ColorSwatch label={color} />
                      {color}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        covered
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900",
                      )}
                    >
                      {covered ? "Есть фото" : "Нет фото"}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {previewImage ? (
                      <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
                        <Image
                          {...productImageRenderProps(
                            resolveProductGalleryImageSrc(productSlug, previewImage.url),
                          )}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : erpPreview ? (
                      <div className="relative size-10 overflow-hidden rounded-md border bg-muted opacity-70">
                        <Image
                          src={erpPreview.src}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized={erpPreview.unoptimized}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2">
                    {covered ? (
                      <span className="text-xs text-muted-foreground">
                        {colorImages.length} фото
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => startTransition(() => onUploadForColor(color))}
                        >
                          Загрузить
                        </Button>
                        {erpImageUrl ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => startTransition(() => onAddErpPlaceholder(color))}
                          >
                            MS placeholder
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
