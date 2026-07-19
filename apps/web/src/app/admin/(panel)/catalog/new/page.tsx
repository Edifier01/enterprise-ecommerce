import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/lib/admin/session";

export default async function AdminNewProductPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  redirect("/admin/integrations/moysklad");
}
