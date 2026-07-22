import { expect, test } from "@playwright/test";

import { loginAsAdmin, loginAsViewerAdmin, openAdminNavIfMobile } from "./test-helpers";

/**
 * Admin catalog smoke — MoySklad-only product workflow.
 */
test.describe("Admin catalog smoke", () => {
  test("manual product creation redirects to MoySklad integration", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/catalog/new");
    await expect(page).toHaveURL(/\/admin\/integrations\/moysklad/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Интеграция МойСклад" })).toBeVisible();
  });

  test("catalog sidebar opens product list directly", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/catalog");
    await expect(page).toHaveURL(/\/admin\/catalog\?all=1/);
    await expect(page.getByRole("heading", { name: "Все товары" })).toBeVisible();
  });

  test("category picker remains available from product list", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/catalog?all=1");
    await page.getByRole("link", { name: "← К категориям" }).click();
    await expect(page).toHaveURL(/view=categories/);
    await expect(page.getByRole("link", { name: "Все товары" })).toBeVisible();
  });

  test("sidebar links import queue under MoySklad section", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/catalog?view=categories");
    await openAdminNavIfMobile(page);
    await expect(page.getByRole("link", { name: "Очередь импорта" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Новый товар" })).toHaveCount(0);
  });

  test("all products tile opens catalog list not import queue", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/catalog?view=categories");
    await page.getByRole("link", { name: "Все товары" }).click();

    await expect(page).toHaveURL(/\/admin\/catalog\?all=1/);
    await expect(page.getByRole("heading", { name: "Все товары" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Импорт из МойСклад" })).toHaveCount(0);
  });

  test("viewer catalog list hides write actions", async ({ page }) => {
    await loginAsViewerAdmin(page);

    await page.goto("/admin/catalog?all=1");
    await expect(page.getByRole("heading", { name: "Все товары" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Изменить" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Скрыть с витрины" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "+ Категория" })).toHaveCount(0);
  });

  test("catalog list shows MoySklad stock column", async ({ page }) => {
    await loginAsAdmin(page);
    const main = page.getByRole("main");

    await page.goto("/admin/catalog?all=1");
    await expect(
      main.getByText("Остаток (МС)", { exact: true }).and(page.locator(":visible")).first(),
    ).toBeVisible();
  });

  test("catalog list shows category column and edit back link preserves filter", async ({ page }) => {
    await loginAsAdmin(page);
    const main = page.getByRole("main");

    await page.goto("/admin/catalog?all=1");
    await expect(
      main.getByText("Категория", { exact: true }).and(page.locator(":visible")).first(),
    ).toBeVisible();

    await page.goto("/admin/catalog?all=1&needs_styling=1");
    const editLink = main.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products needing styling in E2E seed");
      return;
    }

    await editLink.click();
    await expect(page).toHaveURL(/\/admin\/catalog\/.+\/edit\?from=/);

    const backLink = page.getByRole("link", { name: "← Требует оформления" });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/needs_styling=1/);
    await expect(page.getByRole("link", { name: "Требует оформления" })).toHaveClass(/font-medium/);
  });
});
