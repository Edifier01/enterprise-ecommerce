export type SiteLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: SiteLink[];
};

export const siteConfig = {
  name: "Сухопут",
  description:
    "Интернет-магазин тактического и туристического снаряжения — экипировка для поля, походов и профессионального применения",
  locale: "ru-RU" as const,
  defaultCurrency: "RUB" as const,

  contact: {
    supportPrompt: "Нужна помощь с подбором?",
    supportEmail: "support@example.com",
    contactLabel: "Связаться",
    phone: "8 (800) 000-00-00",
    phoneHref: "tel:+78000000000",
  },

  trustBar: {
    items: [
      {
        icon: "shield" as const,
        label: "Собственный бренд",
        description: "Экипировка Сухопут",
      },
      {
        icon: "truck" as const,
        label: "Доставка по РФ",
        description: "От 1 рабочего дня",
      },
      {
        icon: "award" as const,
        label: "Гарантия качества",
        description: "Контроль поставок",
      },
      {
        icon: "support" as const,
        label: "Консультация",
        description: "Поможем с подбором",
      },
    ],
  },

  /** Row 1 — top info bar (без «О компании» и «Обратный звонок»). */
  topBar: {
    links: [
      { label: "ОПТОВИКАМ", href: "/register/wholesale" },
      { label: "КОНТАКТЫ", href: "/" },
      { label: "ПОКУПАТЕЛЮ", href: "/catalog" },
    ] satisfies SiteLink[],
    orderStatus: { label: "СТАТУС ЗАКАЗА", href: "/account/orders" },
  },

  footer: {
    columns: [
      {
        title: "Покупателям",
        links: [
          { label: "Каталог", href: "/catalog" },
          { label: "Доставка и оплата", href: "/catalog" },
          { label: "Возврат", href: "/catalog" },
        ],
      },
      {
        title: "Компания",
        links: [
          { label: "О магазине", href: "/" },
          { label: "Контакты", href: "/" },
        ],
      },
      {
        title: "Аккаунт",
        links: [
          { label: "Профиль", href: "/account" },
          { label: "Корзина", href: "/cart" },
          { label: "Вход", href: "/login" },
        ],
      },
    ] satisfies FooterColumn[],
    copyright: `© ${new Date().getFullYear()} Сухопут. Все права защищены.`,
  },

  images: {
    logo: "/logo.png",
    productPlaceholder: "/images/product-placeholder.svg",
    productPlaceholderExternal: "https://placehold.co/400x400/e2e8f0/64748b?text=Нет+фото",
  },

  /** Fallback sub-links for mega-menu when API has no child categories */
  categorySubLinks: {
    snaryazhenie: [
      { slug: "razgruzki", label: "Разгрузки", href: "/catalog/snaryazhenie" },
      { slug: "ryukzaki", label: "Рюкзаки", href: "/catalog/snaryazhenie" },
      { slug: "podsumki", label: "Подсумки", href: "/catalog/snaryazhenie" },
    ],
    odezhda: [
      { slug: "kurtki", label: "Куртки", href: "/catalog/odezhda" },
      { slug: "termo", label: "Термобельё", href: "/catalog/odezhda" },
      { slug: "shtany", label: "Штаны", href: "/catalog/odezhda" },
    ],
    obuv: [
      { slug: "botinki", label: "Ботинки", href: "/catalog/obuv" },
      { slug: "bercy", label: "Берцы", href: "/catalog/obuv" },
    ],
    aksessuary: [
      { slug: "fonari", label: "Фонари", href: "/catalog/aksessuary" },
      { slug: "ifak", label: "IFAK", href: "/catalog/aksessuary" },
      { slug: "nozhi", label: "Ножи", href: "/catalog/aksessuary" },
    ],
  } as Record<string, { slug: string; label: string; href: string }[]>,

  layout: {
    /** Tailwind class — max-w-7xl (80rem) */
    containerClass: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
    /** Padding for fixed mobile bottom nav */
    mainPaddingClass: "pb-16 md:pb-0",
    productGridClass: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5",
  },

  /** Static categories — offline fallback when API is unreachable */
  catalogDisclaimer:
    "Разделы каталога синхронизируются с API. При недоступности сервера показывается резервный список категорий.",
} as const;

export type SiteConfig = typeof siteConfig;
