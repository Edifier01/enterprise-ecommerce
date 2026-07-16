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

    const orderLink = page.locator("table tbody tr a").first();
    const hasOrders = await orderLink.count();
    if (hasOrders > 0) {
      await orderLink.click();
      await expect(page.getByText("← К списку заказов")).toBeVisible();
    }
  });
});
