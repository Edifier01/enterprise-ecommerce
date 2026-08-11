import Link from "next/link";

import { siteConfig } from "@/lib/store/site-config";

const INFO_LINKS = [
  { label: "Доставка", href: "/delivery", description: "Сроки и способы доставки по РФ" },
  { label: "Оплата", href: "/payment", description: "Доступные способы оплаты" },
  { label: "Возврат", href: "/returns", description: "Условия возврата товара" },
] as const;

export function ProductDeliveryInfo() {
  return (
    <section aria-labelledby="product-delivery-heading" className="space-y-3">
      <h2 id="product-delivery-heading" className="text-sm font-semibold text-foreground">
        Доставка и возврат
      </h2>
      <ul className="grid gap-2 sm:grid-cols-3">
        {INFO_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-lg border border-border bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <span className="text-sm font-medium text-foreground">{link.label}</span>
              <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProductTrustBlock() {
  const { trustBar, contact } = siteConfig;

  return (
    <section aria-labelledby="product-trust-heading" className="space-y-3">
      <h2 id="product-trust-heading" className="text-sm font-semibold text-foreground">
        Почему Сухопут
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {trustBar.items.map((item) => (
          <li
            key={item.label}
            className="rounded-lg border border-border bg-background px-4 py-3"
          >
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            {item.description ? (
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {contact.supportPrompt}{" "}
        <Link href="/contacts" className="font-medium text-primary hover:underline">
          {contact.contactLabel}
        </Link>
        {contact.phone ? (
          <>
            {" "}
            или{" "}
            <a href={contact.phoneHref} className="font-medium text-primary hover:underline">
              {contact.phone}
            </a>
          </>
        ) : null}
        .
      </p>
    </section>
  );
}
