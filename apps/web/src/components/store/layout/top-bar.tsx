import Link from "next/link";
import { Mail } from "lucide-react";

import { CatalogSearchForm } from "@/components/store/catalog/catalog-search-form";
import { siteConfig } from "@/lib/store/site-config";

export function TopBar() {
  const { contact } = siteConfig;

  return (
    <div className="border-b bg-muted/40 text-xs sm:text-sm">
      <div className={siteConfig.layout.containerClass}>
        <div className="hidden h-10 items-center gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,28rem)_minmax(0,1fr)] md:gap-6">
          <span className="truncate text-muted-foreground">{contact.supportPrompt}</span>
          <CatalogSearchForm compact />
          <div className="flex items-center justify-end gap-3 sm:gap-4">
            <a
              href={`mailto:${contact.supportEmail}`}
              className="inline-flex max-w-[12rem] items-center gap-1.5 truncate text-muted-foreground transition-colors hover:text-foreground sm:max-w-none"
            >
              <Mail className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{contact.supportEmail}</span>
            </a>
            <Link
              href="/"
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              {contact.contactLabel}
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 py-2 md:hidden">
          <div className="flex h-8 items-center justify-between gap-3">
            <span className="truncate text-muted-foreground">{contact.supportPrompt}</span>
            <div className="flex shrink-0 items-center gap-3">
              <a
                href={`mailto:${contact.supportEmail}`}
                className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
                aria-label={contact.supportEmail}
              >
                <Mail className="size-3.5" aria-hidden />
              </a>
              <Link
                href="/"
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                {contact.contactLabel}
              </Link>
            </div>
          </div>
          <CatalogSearchForm compact />
        </div>
      </div>
    </div>
  );
}
