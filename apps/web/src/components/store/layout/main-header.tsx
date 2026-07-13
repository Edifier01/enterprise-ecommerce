import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { mainNavigation } from "@/lib/store/navigation";
import { siteConfig } from "@/lib/store/site-config";

export async function MainHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className={siteConfig.layout.containerClass}>
        <div className="flex h-14 items-center justify-between gap-4 md:h-16">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-lg font-semibold uppercase tracking-wide text-foreground"
          >
            <Image
              src={siteConfig.images.logo}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
              priority
            />
            <span>{siteConfig.name}</span>
          </Link>

          <nav
            className="hidden items-center gap-0.5 md:flex"
            aria-label="Основная навигация"
          >
            {mainNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/cart"
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Корзина"
            >
              <ShoppingCart className="size-5" aria-hidden />
            </Link>
            {user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/account" />}
                >
                  Профиль
                </Button>
                <form action={logoutAction}>
                  <Button type="submit" variant="ghost" size="sm">
                    Выход
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href="/login" />}
                >
                  Вход
                </Button>
                <Button size="sm" render={<Link href="/register" />}>
                  Регистрация
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
