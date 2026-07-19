import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Mobile admin panel", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("admin routes hide storefront chrome", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("link", { name: "Сухопут" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toHaveCount(
      0,
    );
  });

  test("mobile menu opens and navigates to catalog", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByRole("button", { name: "Меню админ-панели" })).toBeVisible();
    await page.getByRole("button", { name: "Меню админ-панели" }).click();
    await expect(page.getByRole("dialog", { name: "Навигация админ-панели" })).toBeVisible();

    await page.getByRole("link", { name: "Товары" }).click();
    await expect(page).toHaveURL(/\/admin\/catalog/, { timeout: 15_000 });
    await expect(page.getByRole("dialog", { name: "Навигация админ-панели" })).toHaveCount(0);
  });

  test("customers page uses card layout without horizontal table scroll", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: "Меню админ-панели" }).click();
    await page.getByRole("link", { name: "Клиенты" }).click();
    await expect(page).toHaveURL(/\/admin\/customers/, { timeout: 15_000 });

    await expect(page.locator("table")).toHaveCount(0);
    await expect(page.getByText("Зарегистрированных клиентов пока нет.").or(page.locator("li.rounded-lg.border"))).toBeVisible();
  });
});
