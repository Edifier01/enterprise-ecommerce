import type { Metadata } from "next";

import { SearchPlaceholder } from "@/components/store/catalog/search-placeholder";
import { PageContainer } from "@/components/store/layout/page-container";

export const metadata: Metadata = {
  title: "Поиск",
  description: "Поиск по каталогу товаров",
};

export default function SearchPage() {
  return (
    <PageContainer as="div" className="space-y-8">
      <header className="space-y-2 text-center sm:text-left">
        <h1 className="store-section-title">Поиск</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Найдите нужный товар по названию или артикулу
        </p>
      </header>

      <SearchPlaceholder />
    </PageContainer>
  );
}
