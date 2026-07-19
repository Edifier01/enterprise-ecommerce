import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist } from "next/font/google";

import { ConditionalStoreChrome } from "@/components/store/layout/conditional-store-chrome";
import { MobileBottomNav } from "@/components/store/layout/mobile-bottom-nav";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { SiteFooter } from "@/components/store/layout/site-footer";
import { StoreHeader } from "@/components/store/layout/store-header";
import { StoreMain } from "@/components/store/layout/store-main";
import { ToastProvider } from "@/components/store/ui/toast-provider";
import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png", type: "image/png" }],
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3d4f3a" },
    { media: "(prefers-color-scheme: dark)", color: "#3d4f3a" },
  ],
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
          <PwaRegister />
          <ConditionalStoreChrome
            storefront={
              <>
                <StoreHeader />
                <StoreMain>{children}</StoreMain>
                <SiteFooter />
                <MobileBottomNav />
              </>
            }
          >
            {children}
          </ConditionalStoreChrome>
        </ToastProvider>
      </body>
    </html>
  );
}
