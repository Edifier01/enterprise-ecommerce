import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin UX Wave 10 smoke — workflow action queue", () => {
  test("workflow page shows action queue and status lanes", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog/workflow");

    await expect(page.getByRole("heading", { name: "Оформление товаров" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Требует действий" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Статусы каталога" })).toBeVisible();
  });

  test("workflow queue CTA opens import or catalog list", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog/workflow");

    const importCta = page.getByRole("link", { name: "Открыть импорт" });
    const hasImport = await importCta.count();
    if (hasImport > 0) {
      await importCta.first().click();
      await expect(page).toHaveURL(/\/admin\/integrations\/moysklad\/import/);
      return;
    }

    const listCta = page.getByRole("link", { name: "Открыть список" }).first();
    const hasList = await listCta.count();
    if (hasList > 0) {
      await listCta.click();
      await expect(page).toHaveURL(/\/admin\/catalog/);
    }
  });
});
