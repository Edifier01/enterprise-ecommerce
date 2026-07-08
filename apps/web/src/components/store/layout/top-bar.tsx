import Link from "next/link";
import { Mail } from "lucide-react";

import { siteConfig } from "@/lib/store/site-config";

export function TopBar() {
  const { contact } = siteConfig;

  return (
    <div className="border-b bg-muted/40 text-xs sm:text-sm">
      <div className={siteConfig.layout.containerClass}>
        <div className="flex h-9 items-center justify-between gap-3 sm:h-10">
          <span className="truncate text-muted-foreground">
            {contact.supportPrompt}
          </span>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
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
      </div>
    </div>
  );
}
