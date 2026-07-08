import Link from "next/link";

import { siteConfig } from "@/lib/store/site-config";

export function SiteFooter() {
  const { footer, contact, name, description } = siteConfig;

  return (
    <footer className="border-t bg-muted/20">
      <div className={`${siteConfig.layout.containerClass} py-10`}>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-lg font-semibold">{name}</p>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p>{contact.phone}</p>
              <a
                href={`mailto:${contact.supportEmail}`}
                className="transition-colors hover:text-foreground"
              >
                {contact.supportEmail}
              </a>
            </div>
          </div>

          {footer.columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold">{column.title}</h2>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          {footer.copyright}
        </p>
      </div>
    </footer>
  );
}
