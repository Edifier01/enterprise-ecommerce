import type { AdminProduct } from "@/lib/admin/catalog-shared";
import { getGalleryColorCoverage } from "@/lib/admin/gallery-color-coverage";

export type PublishBlocker = "missing_category" | "missing_photo" | "missing_color_photos";

const BLOCKER_LABELS: Record<PublishBlocker, string> = {
  missing_category: "нет категории",
  missing_photo: "нет фото",
  missing_color_photos: "не все цвета в галерее",
};

export function hasDisplayPhoto(product: AdminProduct): boolean {
  return Boolean(product.image_url?.trim()) || product.images.length > 0;
}

export function getPublishBlockers(product: AdminProduct): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];
  if (!product.category_id) {
    blockers.push("missing_category");
  }
  if (!hasDisplayPhoto(product)) {
    blockers.push("missing_photo");
  }
  if (getGalleryColorCoverage(product).needsColorPhotos) {
    blockers.push("missing_color_photos");
  }
  return blockers;
}

export function isReadyToPublish(product: AdminProduct): boolean {
  return getPublishBlockers(product).length === 0;
}

export type MerchandisingChecklistItem = {
  label: string;
  done: boolean;
};

export function getMerchandisingChecklistItems(product: AdminProduct): MerchandisingChecklistItem[] {
  const colorCoverage = getGalleryColorCoverage(product);
  const hasPhoto = hasDisplayPhoto(product);
  const colorPhotosDone = colorCoverage.colors.length < 2 || !colorCoverage.needsColorPhotos;

  return [
    { label: "Категория", done: Boolean(product.category_id) },
    { label: "Фото", done: hasPhoto },
    ...(colorCoverage.colors.length >= 2
      ? [{ label: "Цвета в галерее", done: colorPhotosDone }]
      : []),
    { label: "Опубликован", done: product.status === "active" },
  ];
}

export function summarizePublishSkips(
  skipCounts: Partial<Record<PublishBlocker, number>>,
): string {
  const parts = (Object.entries(skipCounts) as [PublishBlocker, number][])
    .filter(([, count]) => count > 0)
    .map(([blocker, count]) => `${BLOCKER_LABELS[blocker]} (${count})`);

  return parts.length > 0 ? parts.join(", ") : "";
}
