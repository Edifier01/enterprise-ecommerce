import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

export interface SeoContentBlockProps {
  title?: string;
  paragraphs?: string[];
  className?: string;
}

const DEFAULT_PARAGRAPHS = [
  `${siteConfig.name} — современный интернет-магазин с широким ассортиментом товаров для повседневных задач. Мы работаем с проверенными поставщиками, контролируем качество и помогаем подобрать подходящий вариант под ваши требования.`,
  "Оформление заказа занимает несколько минут: добавьте товары в корзину, выберите удобный способ доставки и оплаты. Если нужна консультация — свяжитесь с нашей службой поддержки по телефону или электронной почте, указанным в шапке сайта.",
];

export function SeoContentBlock({
  title = `О магазине ${siteConfig.name}`,
  paragraphs = DEFAULT_PARAGRAPHS,
  className,
}: SeoContentBlockProps) {
  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="seo-content-heading"
      className={cn(
        "rounded-xl border bg-muted/20 px-4 py-6 sm:px-6 sm:py-8",
        className
      )}
    >
      <h2
        id="seo-content-heading"
        className="store-section-title text-xl sm:text-2xl"
      >
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
