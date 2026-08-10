import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

/**
 * Admin orders smoke (Sprint D).
 * Lists orders and opens detail page after admin login.
 */
test.describe("Admin orders smoke", () => {
  test("admin can open orders list and detail", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Заказы" })).toBeVisible();
    await expect(page.getByLabel("Поиск по заказам")).toBeVisible();

    const orderLink = page.locator('main a[href*="/admin/orders/ORD-"]').first();
    if ((await orderLink.count()) === 0) {
      return;
    }

    await orderLink.click();
    await expect(page).toHaveURL(/\/admin\/orders\/ORD-/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Заказ ORD-/);
    await expect(
      page.getByRole("heading", { name: /Доставка и клиент/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
