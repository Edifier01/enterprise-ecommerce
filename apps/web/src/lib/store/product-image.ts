import { siteConfig } from "@/lib/store/site-config";

/** Tiny neutral blur used while product photos load (reduces CLS). */
export const PRODUCT_IMAGE_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IGZpbGw9IiNlMmU4ZjAiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiLz48L3N2Zz4=";

function readMediaBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim() || "";
  return raw.length > 0 ? raw.replace(/\/$/, "") : null;
}

/**
 * Resolve product image URLs for storefront/admin display.
 * Absolute URLs and site-relative paths (/media/...) are returned as-is.
 */
export function resolveProductImageUrl(src?: string | null): string {
  if (!src || src.trim().length === 0) {
    return siteConfig.images.productPlaceholder;
  }

  const trimmed = src.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }

  const mediaBase = readMediaBaseUrl();
  if (mediaBase) {
    return `${mediaBase}/${trimmed.replace(/^\//, "")}`;
  }

  return `/${trimmed.replace(/^\//, "")}`;
}

export function shouldUnoptimizeProductImage(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

export function productImagePlaceholderProps(src: string): {
  placeholder?: "blur";
  blurDataURL?: string;
} {
  if (src.endsWith(".svg") || src.includes("product-placeholder.svg")) {
    return {};
  }

  return {
    placeholder: "blur",
    blurDataURL: PRODUCT_IMAGE_BLUR_DATA_URL,
  };
}

export function productImageRenderProps(src?: string | null) {
  const resolved = resolveProductImageUrl(src);

  return {
    src: resolved,
    unoptimized: shouldUnoptimizeProductImage(resolved),
    ...productImagePlaceholderProps(resolved),
  };
}
