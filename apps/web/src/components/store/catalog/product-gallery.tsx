"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

import { ProductThumbnail } from "@/components/store/catalog/product-thumbnail";
import { productImageRenderProps } from "@/lib/store/product-image";
import { cn } from "@/lib/utils";

export type GalleryImage = {
  src: string;
  alt: string;
};

export interface ProductGalleryProps {
  images: GalleryImage[];
  productSlug: string;
}

export function ProductGallery({ images, productSlug }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loupe, setLoupe] = useState<{ x: number; y: number } | null>(null);

  const safeIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const active = images[safeIndex] ?? images[0];
  const image = productImageRenderProps(active?.src ?? "");

  useEffect(() => {
    setActiveIndex(0);
    setLoupe(null);
  }, [images]);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => (index - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % images.length);
      }
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen, images.length, closeLightbox]);

  if (!active) return null;

  function onMainMove(event: MouseEvent<HTMLButtonElement>) {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setLoupe({ x, y });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg border bg-muted ring-1 ring-foreground/5"
        onMouseMove={onMainMove}
        onMouseLeave={() => setLoupe(null)}
        onClick={() => setLightboxOpen(true)}
        aria-label="Открыть фото крупным планом"
      >
        <ProductThumbnail
          src={image.src}
          productSlug={productSlug}
          alt={active.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain"
        />
        {loupe ? (
          <div
            className="pointer-events-none absolute inset-0 hidden bg-no-repeat md:block"
            style={{
              backgroundImage: `url(${image.src})`,
              backgroundSize: "200%",
              backgroundPosition: `${loupe.x}% ${loupe.y}%`,
            }}
            aria-hidden
          />
        ) : null}
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md border bg-background/90 px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <ZoomIn className="size-3.5" aria-hidden />
          Увеличить
        </span>
      </button>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((item, index) => {
            const thumb = productImageRenderProps(item.src);
            return (
              <button
                key={`${item.src}-${index}`}
                type="button"
                aria-label={`Показать фото ${index + 1}`}
                aria-pressed={index === safeIndex}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-md border",
                  index === safeIndex && "border-primary",
                )}
              >
                <Image
                  src={thumb.src}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized={thumb.unoptimized}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Галерея товара"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border bg-background text-foreground"
            aria-label="Закрыть"
            onClick={closeLightbox}
          >
            <X className="size-5" aria-hidden />
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-4 inline-flex size-10 items-center justify-center rounded-full border bg-background text-foreground"
                aria-label="Предыдущее фото"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex((index) => (index - 1 + images.length) % images.length);
                }}
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-foreground md:right-16"
                aria-label="Следующее фото"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex((index) => (index + 1) % images.length);
                }}
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </>
          ) : null}

          <div
            className="relative h-[min(85vh,900px)] w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={image.src}
              alt={active.alt}
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized={image.unoptimized}
              priority
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
