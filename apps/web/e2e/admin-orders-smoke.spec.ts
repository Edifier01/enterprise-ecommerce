import { expect, test } from "@playwright/test";

/**
 * Admin orders smoke (Sprint D).
 * Lists orders and opens detail page after admin login.
 */
test.describe("Admin orders smoke", () => {
  test("admin can open orders list and detail", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("admin@localhost");
    await page.getByLabel("Пароль").fill("admin12345");
    await page.getByRole("button", { name: "Войти" }).click();
    await page.waitForURL("**/admin");

    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Заказы" })).toBeVisible();

    const orderLink = page.locator('table tbody tr a').first();
    const hasOrders = await orderLink.count();
    if (hasOrders > 0) {
      await orderLink.click();
      await expect(page.getByText("← К списку заказов")).toBeVisible();
    }
  });
});
