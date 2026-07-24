"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

import {
  erpImageProxyPath,
  productImageRenderProps,
} from "@/lib/store/product-image";

type ProductThumbnailProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt: string;
  productSlug?: string;
  erpImageUrl?: string | null;
};

export function ProductThumbnail({
  src,
  alt,
  productSlug,
  erpImageUrl: _erpImageUrl,
  ...props
}: ProductThumbnailProps) {
  const primary = productImageRenderProps(src);
  const erpFallback = productSlug
    ? productImageRenderProps(erpImageProxyPath(productSlug))
    : null;
  const [current, setCurrent] = useState(primary);

  useEffect(() => {
    setCurrent(primary);
  }, [primary.src]);

  return (
    <Image
      {...props}
      src={current.src}
      alt={alt}
      unoptimized={current.unoptimized}
      placeholder={current.placeholder}
      blurDataURL={current.blurDataURL}
      onError={() => {
        if (erpFallback && current.src !== erpFallback.src) {
          setCurrent(erpFallback);
          return;
        }
        const placeholder = productImageRenderProps(null);
        if (current.src !== placeholder.src) {
          setCurrent(placeholder);
        }
      }}
    />
  );
}
