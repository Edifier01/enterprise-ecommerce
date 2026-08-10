import { siteConfig } from "@/lib/store/site-config";

const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isProductDetailRoute(pathname: string): boolean {
  return pathname.startsWith("/products/");
}

/** Routes where the fixed bottom nav is replaced by page-specific CTAs. */
export function shouldShowMobileBottomNav(pathname: string): boolean {
  if (pathname === "/cart") {
    return false;
  }
  if (pathname.startsWith("/checkout")) {
    return false;
  }
  if (isAuthRoute(pathname)) {
    return false;
  }
  // PDP uses its own sticky purchase bar; keep nav hidden to avoid dual chrome.
  if (isProductDetailRoute(pathname)) {
    return false;
  }
  return true;
}

export function getMobileMainPaddingClass(pathname: string): string {
  if (pathname === "/cart") {
    return "pb-[calc(var(--store-mobile-sticky-cta-height)+env(safe-area-inset-bottom,0px))] md:pb-0";
  }
  if (pathname.startsWith("/checkout")) {
    return "pb-6 md:pb-0";
  }
  if (isProductDetailRoute(pathname)) {
    return "pb-[calc(var(--store-mobile-sticky-cta-height)+env(safe-area-inset-bottom,0px))] md:pb-0";
  }
  if (isAuthRoute(pathname)) {
    return "pb-6 md:pb-0";
  }
  return siteConfig.layout.mainPaddingClass;
}

export function getMobileFooterPaddingClass(pathname: string): string {
  if (shouldShowMobileBottomNav(pathname)) {
    return "pb-[calc(var(--store-mobile-nav-offset)+1rem)] md:pb-0";
  }
  return "";
}
