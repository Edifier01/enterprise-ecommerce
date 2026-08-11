export type InfoPageSection = {
  heading: string;
  body: string;
};

export type InfoPageContent = {
  title: string;
  description: string;
  /** True when copy is placeholder — show honest stub banner */
  isPlaceholder: boolean;
  sections: InfoPageSection[];
};

export const infoPages = {
  delivery: {
    title: "Доставка",
    description: "Условия и сроки доставки по России",
    isPlaceholder: true,
    sections: [
      {
        heading: "География",
        body: "Доставляем по всей России. Точные сроки и стоимость зависят от региона и выбранной службы — уточняйте при оформлении заказа или по телефону.",
      },
      {
        heading: "Сроки",
        body: "От 1 рабочего дня после подтверждения заказа и комплектации на складе. Финальные сроки сообщаются оператором.",
      },
    ],
  },
  payment: {
    title: "Оплата",
    description: "Способы оплаты заказов",
    isPlaceholder: true,
    sections: [
      {
        heading: "Онлайн-оплата",
        body: "На сайте подключается приём платежей через YooKassa. До запуска в production возможен тестовый режим — актуальные способы оплаты уточняйте при оформлении.",
      },
      {
        heading: "Для юридических лиц",
        body: "Оптовым клиентам доступны отдельные условия. Раздел «Оптовикам» в шапке сайта.",
      },
    ],
  },
  returns: {
    title: "Возврат и обмен",
    description: "Порядок возврата товара надлежащего качества",
    isPlaceholder: true,
    sections: [
      {
        heading: "Общие условия",
        body: "Возврат возможен в сроки, установленные законом о защите прав потребителей. Товар должен сохранить товарный вид и комплектацию.",
      },
      {
        heading: "Как оформить",
        body: "Свяжитесь с нами по телефону или email из раздела «Контакты». Мы подскажем порядок и необходимые документы.",
      },
    ],
  },
  contacts: {
    title: "Контакты",
    description: "Связь с магазином",
    isPlaceholder: false,
    sections: [
      {
        heading: "Телефон и email",
        body: "Используйте контакты в шапке и подвале сайта. Актуальные реквизиты для юридических лиц предоставляются по запросу.",
      },
      {
        heading: "Консультация по подбору",
        body: "Поможем подобрать экипировку под задачу — опишите запрос при обращении.",
      },
    ],
  },
  about: {
    title: "О магазине",
    description: "Сухопут — тактическое и туристическое снаряжение",
    isPlaceholder: true,
    sections: [
      {
        heading: "Сухопут",
        body: "Интернет-магазин тактического и туристического снаряжения. Ассортимент синхронизируется с учётной системой; на витрине — проверенные фото и описания от команды магазина.",
      },
    ],
  },
} as const satisfies Record<string, InfoPageContent>;

export type InfoPageKey = keyof typeof infoPages;
