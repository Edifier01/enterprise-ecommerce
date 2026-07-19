"use client";

import { usePathname } from "next/navigation";

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function ConditionalStoreChrome({
  children,
  storefront,
}: {
  children: React.ReactNode;
  storefront: React.ReactNode;
}) {
  const pathname = usePathname();

  if (isAdminRoute(pathname)) {
    return <>{children}</>;
  }

  return storefront;
}
