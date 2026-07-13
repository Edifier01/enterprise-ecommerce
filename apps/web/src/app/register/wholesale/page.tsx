import type { Metadata } from "next";

import { WholesaleRegisterForm } from "@/components/auth/wholesale-register-form";
import { siteConfig } from "@/lib/store/site-config";

export const metadata: Metadata = {
  title: "Регистрация оптовика",
  description: `Регистрация оптового покупателя в ${siteConfig.name}`,
};

export default function WholesaleRegisterPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <WholesaleRegisterForm />
    </div>
  );
}
