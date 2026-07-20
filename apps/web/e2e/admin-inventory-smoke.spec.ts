import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

/**
 * Admin inventory read-only smoke (Wave 4).
 */
test.describe("Admin inventory smoke", () => {
  test("inventory page is read-only without adjust controls", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/inventory");
    await expect(page.getByRole("heading", { name: "Склад" })).toBeVisible();
    await expect(
      page.getByText("Ручная корректировка на сайте отключена"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Обновить" })).toHaveCount(0);
    await expect(page.getByLabel(/Новое количество/i)).toHaveCount(0);
  });

  test("inventory SKU search preserves query in URL", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/inventory");
    await page.getByPlaceholder("Поиск по SKU или названию…").fill("STOCK");
    await page.getByRole("button", { name: "Найти" }).click();
    await expect(page).toHaveURL(/q=STOCK/);
  });
});
