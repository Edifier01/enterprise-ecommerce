import { expect, test } from "@playwright/test";

/**
 * Admin panel foundation smoke (ADR-007).
 * Requires API with seeded dev admin — started by playwright webServer bootstrap.
 */
test.describe("Admin login smoke", () => {
  test("unauthenticated /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: "Вход в админ-панель" })).toBeVisible();
  });

  test("admin logs in and sees dashboard summary", async ({ page }) => {
    await page.goto("/admin/login");

    await page.getByLabel("Email").fill("admin@localhost");
    await page.getByLabel("Пароль").fill("admin12345");
    await page.getByRole("button", { name: "Войти" }).click();

    await page.waitForURL("**/admin");
    await expect(page.getByRole("heading", { name: "Сводка" })).toBeVisible();
    await expect(page.getByText("Заказы сегодня")).toBeVisible();
    await expect(page.getByText("Низкий остаток")).toBeVisible();
  });
});
