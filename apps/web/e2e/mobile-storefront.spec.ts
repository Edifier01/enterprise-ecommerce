import { expect, test } from "@playwright/test";

import { addPrimaryProductToCart, ensureCartEmpty } from "./test-helpers";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Mobile storefront", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("compact header hides desktop-only top bar", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("navigation", { name: "Информация для покупателей" }),
    ).toBeHidden();
    // Trust/USP strip lives on homepage content now (not a header band).
    await expect(page.getByRole("button", { name: "Каталог" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Открыть поиск" })).toBeVisible();
    await page.getByRole("button", { name: "Открыть поиск" }).click();
    // Desktop header search stays in DOM (md:block); assert the visible mobile panel input.
    await expect(page.locator('[aria-label="Поиск по каталогу"]:visible')).toBeVisible();
  });

  test("bottom navigation is visible on homepage", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Мобильная навигация" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Главная" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Корзина" })).toBeVisible();
  });

  test("catalog filters button is tappable on mobile", async ({ page }) => {
    await page.goto("/catalog/odezhda");

    const filtersButton = page.getByRole("button", { name: /^Фильтры/ });
    await expect(filtersButton).toBeVisible();
    await filtersButton.click();
    await expect(page.getByRole("button", { name: "Показать результаты" })).toBeVisible();
  });

  test("cart shows sticky checkout bar without bottom nav", async ({ page }) => {
    await ensureCartEmpty(page);
    await page.goto("/catalog");
    await addPrimaryProductToCart(page);

    await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toBeHidden();
    await expect(page.getByLabel("Итого по корзине")).toBeVisible();
    await expect(page.getByRole("button", { name: "Оформить" })).toBeVisible();
  });

  test("checkout hides bottom navigation", async ({ page }) => {
    await ensureCartEmpty(page);
    await page.goto("/catalog");
    await addPrimaryProductToCart(page);

    await page.getByRole("button", { name: "Оформить" }).click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15_000 });
    await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toBeHidden();
  });

  test("PDP hides bottom nav and shows sticky purchase CTA", async ({ page }) => {
    await page.goto("/catalog");
    const productLink = page.locator('a[href^="/products/"]').first();
    await expect(productLink).toBeVisible({ timeout: 15_000 });
    await productLink.click();
    await expect(page).toHaveURL(/\/products\//, { timeout: 15_000 });

    await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toBeHidden();

    const purchase = page.getByRole("button", { name: /В корзину|Купить/ }).first();
    await expect(purchase).toBeVisible();
    await purchase.scrollIntoViewIfNeeded();
    // Scroll past purchase panel so sticky bar appears
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const stickyCta = page.locator(".fixed").filter({ hasText: "В корзину" }).first();
    await expect(stickyCta).toBeVisible({ timeout: 10_000 });
  });

  test("login hides bottom navigation", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
  });

  test("filter sheet sits above bottom nav", async ({ page }) => {
    await page.goto("/catalog/odezhda");
    await page.getByRole("button", { name: /^Фильтры/ }).click();
    const apply = page.getByRole("button", { name: "Показать результаты" });
    await expect(apply).toBeVisible();
    const box = await apply.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.y + box.height).toBeLessThanOrEqual(MOBILE_VIEWPORT.height);
    }
  });
});
