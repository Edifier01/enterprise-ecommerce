import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

/**
 * Admin panel foundation smoke (ADR-007).
 * Requires API with seeded dev admin — started by playwright webServer bootstrap.
 */
test.describe("Admin login smoke", () => {
  test("unauthenticated /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByText("Вход в админ-панель")).toBeVisible();
  });

  test("admin logs in and sees dashboard summary", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { name: "Сводка" })).toBeVisible();
    await expect(page.getByText("Заказы сегодня")).toBeVisible();
    await expect(page.getByText("Низкий остаток")).toBeVisible();
  });
});
