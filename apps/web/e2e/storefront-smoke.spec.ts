import { expect, test } from "@playwright/test";

test.describe("Storefront smoke", () => {
  test("catalog page loads with Russian heading", async ({ page }) => {
    const response = await page.goto("/catalog");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Каталог", exact: true })).toBeVisible();
  });

  test("search page loads with placeholder UI", async ({ page }) => {
    const response = await page.goto("/search");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Поиск" })).toBeVisible();
    await expect(
      page.getByText("Введите название товара в поле выше."),
    ).toBeVisible();
  });

  test("cart page loads with empty state", async ({ page }) => {
    const response = await page.goto("/cart");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Корзина" })).toBeVisible();
    await expect(page.getByText("Проверьте товары перед переходом к оплате.")).toBeVisible();
  });

  test("checkout page loads payment shell", async ({ page }) => {
    const response = await page.goto("/checkout");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Оформление заказа" })).toBeVisible();
    await expect(page.getByText("Магазин не получает и не хранит данные карты.")).toBeVisible();
  });

  test("login page loads with Russian form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Вход", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
  });
});
