"use client";

import { PageContainer } from "@/components/store/layout/page-container";
import { StoreErrorState } from "@/components/store/ui/store-error-state";

type StoreErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function StoreError({ reset }: StoreErrorProps) {
  return (
    <PageContainer as="div">
      <StoreErrorState
        title="Что-то пошло не так"
        description="Не удалось отобразить страницу. Попробуйте ещё раз или вернитесь на главную."
        onRetry={reset}
        action={{ label: "На главную", href: "/" }}
      />
    </PageContainer>
  );
}
