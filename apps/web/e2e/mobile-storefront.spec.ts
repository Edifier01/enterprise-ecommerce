import { expect, test } from "@playwright/test";

import { addPrimaryProductToCart, ensureCartEmpty } from "./test-helpers";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Mobile storefront", () => {
  test.use(MOBILE_VIEWPORT);

  test("compact header hides desktop-only top bar", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("navigation", { name: "Информация для покупателей" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Преимущества магазина")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Каталог" }).first()).toBeVisible();
    await expect(page.getByLabel("Поиск по каталогу")).toBeVisible();
  });

  test("bottom navigation is visible on homepage", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Мобильная навигация" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Главная" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Корзина" })).toBeVisible();
  });

  test("catalog filters button is tappable on mobile", async ({ page }) => {
    await page.goto("/catalog");

    const filtersButton = page.getByRole("button", { name: /^Фильтры/ });
    await expect(filtersButton).toBeVisible();
    await filtersButton.click();
    await expect(page.getByRole("button", { name: "Показать результаты" })).toBeVisible();
  });

  test("cart shows sticky checkout bar without bottom nav", async ({ page }) => {
    await ensureCartEmpty(page);
    await page.goto("/catalog");
    await addPrimaryProductToCart(page);

    await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toHaveCount(
      0,
    );
    await expect(page.getByLabel("Итого по корзине")).toBeVisible();
    await expect(page.getByRole("button", { name: "Оформить" })).toBeVisible();
  });

  test("checkout hides bottom navigation", async ({ page }) => {
    await ensureCartEmpty(page);
    await page.goto("/catalog");
    await addPrimaryProductToCart(page);

    await page.getByRole("button", { name: "Оформить" }).click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15_000 });
    await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toHaveCount(
      0,
    );
  });
});
