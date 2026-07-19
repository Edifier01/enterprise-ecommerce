"use client";

import { usePathname } from "next/navigation";

import { getMobileMainPaddingClass } from "@/lib/store/mobile-layout";
import { cn } from "@/lib/utils";

export function StoreMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className={cn("flex-1", getMobileMainPaddingClass(pathname))}>
      {children}
    </main>
  );
}
