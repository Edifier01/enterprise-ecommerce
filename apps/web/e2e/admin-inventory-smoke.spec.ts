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
    await expect(page.getByRole("button", { name: "Обновить остатки" })).toBeVisible();
    await expect(page.getByLabel(/Новое количество/i)).toHaveCount(0);
  });

  test("inventory product link opens edit with return context", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/inventory?low_stock=true&q=STOCK");
    const productLink = page.getByRole("link", { name: "Товар" }).first();
    if ((await productLink.count()) === 0) {
      test.skip(true, "No inventory rows in E2E seed");
    }
    await productLink.click();
    await expect(page).toHaveURL(/\/admin\/catalog\/[^/]+\/edit\?from=/);
    await expect(page.getByRole("link", { name: "← Низкий остаток" })).toBeVisible();
  });

  test("inventory SKU search preserves query in URL", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/inventory");
    await page.getByPlaceholder("Поиск по SKU или названию…").fill("STOCK");
    await page.getByRole("button", { name: "Найти" }).click();
    await expect(page).toHaveURL(/q=STOCK/);
  });
});
