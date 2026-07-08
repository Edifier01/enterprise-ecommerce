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

/** Primary storefront navigation — 5 items (stich.su pattern) */
export const storeNavigation: StoreNavItem[] = [
  { label: "Главная", href: "/", icon: Home },
  { label: "Каталог", href: "/catalog", icon: LayoutGrid },
  { label: "Поиск", href: "/search", icon: Search },
  { label: "Корзина", href: "/cart", icon: ShoppingCart },
  { label: "Профиль", href: "/account", icon: User },
];

export const mainNavigation = storeNavigation;
export const mobileNavigation = storeNavigation;
