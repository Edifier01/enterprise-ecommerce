import { getApiBase } from "@/lib/api-base";
import { siteConfig } from "@/lib/store/site-config";

/** Tiny neutral blur used while product photos load (reduces CLS). */
export const PRODUCT_IMAGE_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IGZpbGw9IiNlMmU4ZjAiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiLz48L3N2Zz4=";

function readMediaBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim() || "";
  return raw.length > 0 ? raw.replace(/\/$/, "") : null;
}

function resolveMediaPath(path: string): string {
  const mediaBase = readMediaBaseUrl();
  if (mediaBase) {
    const relativePath = path.replace(/^\/media\/?/, "");
    return `${mediaBase}/${relativePath}`;
  }

  const apiBase = getApiBase().replace(/\/$/, "");
  return `${apiBase}${path}`;
}

function resolveApiPath(path: string): string {
  const apiBase = getApiBase().replace(/\/$/, "");
  return `${apiBase}${path}`;
}

function isMoySkladDownloadUrl(src: string): boolean {
  const lowered = src.toLowerCase();
  return lowered.includes("api.moysklad.ru") && lowered.includes("/download/");
}

export function erpImageProxyPath(slug: string): string {
  return `/api/v1/products/${slug}/erp-image`;
}

/**
 * Resolve product image URLs for storefront/admin display.
 * Absolute URLs pass through; /media/ and /api/ paths resolve via site/API base.
 */
export function resolveProductImageUrl(src?: string | null): string {
  if (!src || src.trim().length === 0) {
    return siteConfig.images.productPlaceholder;
  }

  const trimmed = src.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/api/")) {
    return resolveApiPath(trimmed);
  }

  if (trimmed.startsWith("/media/")) {
    return resolveMediaPath(trimmed);
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  const mediaBase = readMediaBaseUrl();
  if (mediaBase) {
    return `${mediaBase}/${trimmed.replace(/^\//, "")}`;
  }

  return `/${trimmed.replace(/^\//, "")}`;
}

type CatalogProductImageInput = {
  slug: string;
  imageUrl?: string | null;
  erpImageUrl?: string | null;
  galleryUrl?: string | null;
};

function pickFirstImageCandidate(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

/** Pick the best display image for catalog/admin cards and wire proxy for MoySklad URLs. */
export function resolveCatalogProductImageSrc(input: CatalogProductImageInput): string {
  const raw =
    pickFirstImageCandidate(input.imageUrl, input.galleryUrl) ??
    (input.erpImageUrl ? erpImageProxyPath(input.slug) : null);

  if (!raw) {
    return resolveProductImageUrl(null);
  }

  if (isMoySkladDownloadUrl(raw)) {
    return resolveProductImageUrl(erpImageProxyPath(input.slug));
  }

  return resolveProductImageUrl(raw);
}

/** Normalize a single gallery/primary image URL, proxying MoySklad downloads when needed. */
export function resolveProductGalleryImageSrc(slug: string, src?: string | null): string {
  if (!src || src.trim().length === 0) {
    return resolveProductImageUrl(null);
  }

  if (isMoySkladDownloadUrl(src)) {
    return resolveProductImageUrl(erpImageProxyPath(slug));
  }

  return resolveProductImageUrl(src);
}

export function catalogProductImageRenderProps(input: CatalogProductImageInput) {
  return productImageRenderProps(resolveCatalogProductImageSrc(input));
}

export function shouldUnoptimizeProductImage(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/media/") ||
    src.includes("/api/v1/products/") ||
    src.includes("/erp-image")
  );
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
