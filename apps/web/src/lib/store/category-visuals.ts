import type { LucideIcon } from "lucide-react";
import {
  Backpack,
  Crosshair,
  Footprints,
  Shield,
  Shirt,
  Zap,
} from "lucide-react";

export type CategoryVisual = {
  icon: LucideIcon;
  gradientClass: string;
};

const DEFAULT_VISUAL: CategoryVisual = {
  icon: Shield,
  gradientClass: "from-primary/80 to-primary",
};

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  snaryazhenie: {
    icon: Backpack,
    gradientClass: "from-primary/90 to-primary",
  },
  odezhda: {
    icon: Shirt,
    gradientClass: "from-stone-600/90 to-stone-700",
  },
  obuv: {
    icon: Footprints,
    gradientClass: "from-amber-900/80 to-stone-800",
  },
  aksessuary: {
    icon: Zap,
    gradientClass: "from-store-cta/90 to-store-cta",
  },
  elektronika: {
    icon: Crosshair,
    gradientClass: "from-slate-700/90 to-slate-800",
  },
  novinki: {
    icon: Shield,
    gradientClass: "from-primary/70 to-primary",
  },
};

export function getCategoryVisual(slug: string): CategoryVisual {
  return CATEGORY_VISUALS[slug] ?? DEFAULT_VISUAL;
}
