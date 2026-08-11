"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export const PRODUCT_EDIT_SECTIONS = [
  { id: "section-gallery", label: "Фото" },
  { id: "section-basics", label: "Основное" },
  { id: "section-description", label: "Описание" },
  { id: "section-seo", label: "SEO" },
  { id: "section-variants", label: "Варианты" },
] as const;

type AdminProductSectionNavProps = {
  className?: string;
};

export function AdminProductSectionNav({ className }: AdminProductSectionNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string>(PRODUCT_EDIT_SECTIONS[0].id);

  useEffect(() => {
    const elements = PRODUCT_EDIT_SECTIONS.map((section) =>
      document.getElementById(section.id),
    ).filter((element): element is HTMLElement => element != null);

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const nextId = visible[0]?.target.id;
        if (nextId) {
          setActiveId(nextId);
        }
      },
      {
        rootMargin: "-72px 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  function scrollToSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    const navHeight = navRef.current?.offsetHeight ?? 0;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top =
      section.getBoundingClientRect().top + window.scrollY - navHeight - 12;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    setActiveId(sectionId);
  }

  return (
    <nav
      ref={navRef}
      aria-label="Разделы карточки"
      className={cn(
        "sticky top-0 z-20 -mx-1 flex gap-2 overflow-x-auto border-b border-border/60 bg-background/95 px-1 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {PRODUCT_EDIT_SECTIONS.map((section) => {
        const active = activeId === section.id;
        return (
          <button
            key={section.id}
            type="button"
            aria-current={active ? "true" : undefined}
            className={cn(
              "shrink-0 snap-start rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
              "min-h-11 touch-manipulation focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
            onClick={() => scrollToSection(section.id)}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
