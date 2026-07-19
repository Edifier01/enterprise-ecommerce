import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

/**
 * Admin catalog smoke — MoySklad-only product workflow.
 */
test.describe("Admin catalog smoke", () => {
  test("manual product creation redirects to MoySklad integration", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/catalog/new");
    await expect(page).toHaveURL(/\/admin\/integrations\/moysklad/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Интеграция МойСклад" })).toBeVisible();
  });

  test("catalog landing shows import queue entry point", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/catalog");
    await expect(page.getByRole("link", { name: "Очередь импорта" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Новый товар" })).toHaveCount(0);
  });
});
