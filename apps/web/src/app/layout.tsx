import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";

import { MobileBottomNav } from "@/components/store/layout/mobile-bottom-nav";
import { SiteFooter } from "@/components/store/layout/site-footer";
import { StoreHeader } from "@/components/store/layout/store-header";
import { ToastProvider } from "@/components/store/ui/toast-provider";
import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body
        className="flex min-h-screen flex-col"
        suppressHydrationWarning
      >
        <ToastProvider>
          <StoreHeader />
          <main className={cn("flex-1", siteConfig.layout.mainPaddingClass)}>
            {children}
          </main>
          <SiteFooter />
          <MobileBottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
