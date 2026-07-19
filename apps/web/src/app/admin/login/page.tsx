import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { sanitizeAdminRedirect } from "@/lib/admin/redirect";

export const metadata: Metadata = {
  title: "Вход — Админ-панель",
  robots: { index: false, follow: false },
};

type AdminLoginPageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { from } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <AdminLoginForm redirectTo={sanitizeAdminRedirect(from)} />
    </main>
  );
}
