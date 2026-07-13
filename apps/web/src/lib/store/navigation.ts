import {
  Home,
  LayoutGrid,
  Search,
  ShoppingCart,
  User,
  type LucideIcon,
} from "lucide-react";

export type StoreNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Desktop header — text links only (cart/search live elsewhere). */
export const headerNavigation: StoreNavItem[] = [
  { label: "Главная", href: "/", icon: Home },
  { label: "Каталог", href: "/catalog", icon: LayoutGrid },
];

/** Mobile bottom nav — full 5-item pattern. */
export const mobileNavigation: StoreNavItem[] = [
  { label: "Главная", href: "/", icon: Home },
  { label: "Каталог", href: "/catalog", icon: LayoutGrid },
  { label: "Поиск", href: "/search", icon: Search },
  { label: "Корзина", href: "/cart", icon: ShoppingCart },
  { label: "Профиль", href: "/account", icon: User },
];

export const mainNavigation = headerNavigation;
export const storeNavigation = mobileNavigation;
