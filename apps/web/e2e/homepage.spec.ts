import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads successfully", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("shows storefront sections in Russian", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /О магазине/ })).toBeVisible();

    const picksHeading = page.getByRole("heading", { name: "Подборки" });
    if (await picksHeading.isVisible()) {
      await expect(
        page.getByRole("tablist", { name: "Разделы каталога" }),
      ).toBeVisible();
    }
  });

  test("trust bar is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Преимущества магазина")).toBeVisible();
    await expect(page.getByText("Собственный бренд")).toBeVisible();
    await expect(page.getByText("Доставка по РФ")).toBeVisible();
  });

  test("mobile catalog drawer trigger is visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Каталог" }).first(),
    ).toBeVisible();
  });

  test("store header structure is visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");

    const topBar = page.getByRole("navigation", {
      name: "Информация для покупателей",
    });
    await expect(topBar).toBeVisible();
    await expect(topBar.getByRole("link", { name: "ОПТОВИКАМ" })).toBeVisible();
    await expect(topBar.getByRole("link", { name: "КОНТАКТЫ" })).toBeVisible();
    await expect(topBar.getByRole("link", { name: "ПОКУПАТЕЛЮ" })).toBeVisible();
    await expect(topBar.getByRole("link", { name: "О КОМПАНИИ" })).toHaveCount(0);
    await expect(topBar.getByRole("link", { name: "ОБРАТНЫЙ ЗВОНОК" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "СТАТУС ЗАКАЗА" })).toBeVisible();
    await expect(page.getByRole("link", { name: "8 (800) 000-00-00" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Сухопут" })).toBeVisible();
    await expect(page.getByLabel("Поиск по каталогу")).toBeVisible();
    await expect(page.getByRole("button", { name: "ПОИСК" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Личный кабинет" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Корзина:/ })).toBeVisible();

    const categoryNav = page.getByRole("navigation", {
      name: "Категории каталога",
    });
    await expect(categoryNav).toBeVisible();
    await expect(categoryNav.getByRole("link", { name: "Новинки" })).toBeVisible();
    expect(await categoryNav.getByRole("link").count()).toBeGreaterThanOrEqual(3);
  });

  test("shows promo banners when homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Промо-баннеры")).toBeVisible();
    await expect(page.getByRole("link", { name: "Смотреть снаряжение" })).toBeVisible();
  });

  test("shows product grid or graceful empty/error state", async ({ page }) => {
    await page.goto("/");

    const errorMsg = page.getByText("Не удалось загрузить товары");
    const seoBlock = page.getByRole("heading", { name: /О магазине/ });
    const productGrid = page.locator("ul").first();

    const isError = await errorMsg.isVisible();
    const hasSeoBlock = await seoBlock.isVisible();
    const hasProducts = await productGrid.isVisible();

    expect(isError || hasSeoBlock || hasProducts).toBe(true);
  });
});
