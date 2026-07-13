import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads successfully", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("shows storefront sections in Russian", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Новинки" })).toBeVisible();
  });

  test("main navigation links are visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Основная навигация" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Главная" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Каталог" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Корзина" })).toBeVisible();
    await expect(page.getByLabel("Поиск по каталогу")).toBeVisible();
    await expect(page.getByRole("link", { name: "Связаться" })).toBeVisible();
  });

  test("shows product grid or graceful empty/error state", async ({ page }) => {
    await page.goto("/");

    const errorMsg = page.getByText("Не удалось загрузить товары");
    const emptyMsg = page.getByText("Новинки появятся");
    const productGrid = page.locator("ul").first();

    const isError = await errorMsg.isVisible();
    const isEmpty = await emptyMsg.isVisible();
    const hasProducts = await productGrid.isVisible();

    expect(isError || isEmpty || hasProducts).toBe(true);
  });
});
