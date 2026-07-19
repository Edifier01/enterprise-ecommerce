import { siteConfig } from "@/lib/store/site-config";

/** Routes where the fixed bottom nav is replaced by page-specific CTAs. */
export function shouldShowMobileBottomNav(pathname: string): boolean {
  if (pathname === "/cart") {
    return false;
  }
  if (pathname.startsWith("/checkout")) {
    return false;
  }
  return true;
}

export function getMobileMainPaddingClass(pathname: string): string {
  if (pathname === "/cart") {
    return "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0";
  }
  if (pathname.startsWith("/checkout")) {
    return "pb-6 md:pb-0";
  }
  return siteConfig.layout.mainPaddingClass;
}

export function getMobileFooterPaddingClass(pathname: string): string {
  if (shouldShowMobileBottomNav(pathname)) {
    return "pb-[calc(var(--store-mobile-nav-height)+1rem)] md:pb-0";
  }
  return "";
}
