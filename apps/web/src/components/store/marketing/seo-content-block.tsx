import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

export interface SeoContentBlockProps {
  title?: string;
  paragraphs?: string[];
  className?: string;
}

const DEFAULT_PARAGRAPHS = [
  `${siteConfig.name} — специализированный интернет-магазин тактического и туристического снаряжения. Мы подбираем экипировку для полевых условий, походов и профессионального применения: разгрузки, рюкзаки, тактическая одежда, обувь и аксессуары от проверенных производителей.`,
  "Оформление заказа занимает несколько минут. Нужна помощь с выбором размера, камуфляжа или совместимости с вашей системой снаряжения — свяжитесь с нами по телефону или email, указанным в шапке сайта. Оптовикам доступны специальные цены после регистрации.",
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
