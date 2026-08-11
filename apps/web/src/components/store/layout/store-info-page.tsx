import Link from "next/link";

import { PageContainer } from "@/components/store/layout/page-container";
import type { InfoPageContent } from "@/lib/store/info-pages";
import { siteConfig } from "@/lib/store/site-config";

type StoreInfoPageProps = {
  page: InfoPageContent;
  showContactDetails?: boolean;
};

export function StoreInfoPage({ page, showContactDetails = false }: StoreInfoPageProps) {
  const { contact } = siteConfig;

  return (
    <PageContainer as="main">
      <nav className="text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link href="/" className="hover:text-foreground">
          Главная
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{page.title}</span>
      </nav>

      <header className="mt-4 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {page.title}
        </h1>
        <p className="text-sm text-muted-foreground">{page.description}</p>
      </header>

      {page.isPlaceholder ? (
        <p
          className="mt-6 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Текст страницы будет дополнен официальными данными компании. Пока указаны общие
          ориентиры — для точных условий свяжитесь с нами.
        </p>
      ) : null}

      {showContactDetails ? (
        <div className="mt-6 rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium text-foreground">Контакты</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              Телефон:{" "}
              <a href={contact.phoneHref} className="text-foreground hover:underline">
                {contact.phone}
              </a>
            </li>
            <li>
              Email:{" "}
              <a href={`mailto:${contact.supportEmail}`} className="text-foreground hover:underline">
                {contact.supportEmail}
              </a>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="prose prose-neutral mt-8 max-w-none space-y-8 dark:prose-invert">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Вопросы?{" "}
        <Link href="/contacts" className="font-medium text-primary hover:underline">
          Связаться с нами
        </Link>
        {" · "}
        <Link href="/catalog" className="font-medium text-primary hover:underline">
          Перейти в каталог
        </Link>
      </p>
    </PageContainer>
  );
}
