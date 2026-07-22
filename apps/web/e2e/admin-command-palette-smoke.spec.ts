import { expect, test } from "@playwright/test";

import { loginAsAdmin, openAdminCommandPalette } from "./test-helpers";

test.describe("Admin command palette", () => {
  test("opens with keyboard shortcut and navigates to inventory", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");
    await expect(page.getByRole("main")).toBeVisible();

    await openAdminCommandPalette(page);
    await expect(page.getByRole("dialog", { name: "Палитра команд" })).toBeVisible();

    await page.getByPlaceholder("Поиск страниц, представлений, SKU, заказов…").fill("низкий остаток");
    await page.getByRole("button", { name: /Низкий остаток по товарам/i }).click();

    await expect(page).toHaveURL(/\/admin\/inventory\?.*low_stock=true/);
    await expect(page.getByRole("dialog", { name: "Палитра команд" })).toHaveCount(0);
  });

  test("header trigger opens palette on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsAdmin(page);
    await page.goto("/admin");

    await page.getByRole("button", { name: "Открыть палитру команд" }).click();
    await expect(page.getByRole("dialog", { name: "Палитра команд" })).toBeVisible();
  });
});
