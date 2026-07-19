import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/store/site-config";

export const metadata = {
  title: "Нет сети",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Нет подключения к интернету</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Проверьте соединение и попробуйте снова. Некоторые страницы {siteConfig.name} доступны
        офлайн после первого посещения.
      </p>
      <Button className="mt-6" render={<Link href="/" />}>
        На главную
      </Button>
    </main>
  );
}
