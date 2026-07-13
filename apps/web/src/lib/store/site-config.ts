export type SiteLink = {
  label: string;
  href: string;
};

export type TrustBarItem = {
  title: string;
  description?: string;
};

export type FooterColumn = {
  title: string;
  links: SiteLink[];
};

export const siteConfig = {
  name: "СУХОПУТ",
  description: "Интернет-магазин СУХОПУТ — широкий ассортимент и быстрая доставка",
  locale: "ru-RU" as const,
  defaultCurrency: "RUB" as const,

  contact: {
    supportPrompt: "Нужна помощь?",
    supportEmail: "support@example.com",
    contactLabel: "Связаться",
    phone: "+7 (800) 000-00-00",
  },

  trustBar: [
    {
      title: "Гарантия качества",
      description: "Официальная гарантия на все товары",
    },
    {
      title: "Бесплатный возврат",
      description: "14 дней на возврат без лишних вопросов",
    },
    {
      title: "Быстрая доставка",
      description: "Отправка в день заказа по России",
    },
    {
      title: "Безопасная оплата",
      description: "Защищённые платёжные системы",
    },
    {
      title: "Поддержка 7 дней в неделю",
      description: "Поможем с выбором и оформлением",
    },
  ] satisfies TrustBarItem[],

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
    copyright: `© ${new Date().getFullYear()} СУХОПУТ. Все права защищены.`,
  },

  images: {
    logo: "/logo.png",
    productPlaceholder: "/images/product-placeholder.svg",
    productPlaceholderExternal: "https://placehold.co/400x400/e2e8f0/64748b?text=Нет+фото",
  },

  layout: {
    /** Tailwind class — max-w-7xl (80rem) */
    containerClass: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
    /** Padding for fixed mobile bottom nav */
    mainPaddingClass: "pb-16 md:pb-0",
    productGridClass: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5",
  },

  /** Static categories are placeholder until Sprint 7+ backend Category domain */
  catalogDisclaimer:
    "Разделы каталога — демонстрационные. Полная интеграция с API категорий появится позже.",
} as const;

export type SiteConfig = typeof siteConfig;
