import { expect, test } from "@playwright/test";

/**
 * Admin wholesale customer management smoke (Sprint E).
 */
test.describe("Admin wholesale smoke", () => {
  test("admin can open customers list", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Пароль").fill("admin12345");
    await page.getByRole("button", { name: "Войти" }).click();
    await page.waitForURL("**/admin");

    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: "Клиенты" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });
});
