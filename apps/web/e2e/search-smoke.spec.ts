import { expect, test } from "@playwright/test";

test.describe("Catalog search", () => {
  test("search page loads without query", async ({ page }) => {
    const response = await page.goto("/search");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Поиск" })).toBeVisible();
    await expect(
      page.getByText("Введите название товара или артикул в поле выше.")
    ).toBeVisible();
  });

  test("search by product name shows results", async ({ page }) => {
    await page.goto("/search?q=T-Shirt");

    await expect(page.getByRole("heading", { name: /Найдено:/ })).toBeVisible();
    await expect(page.getByText("Classic White T-Shirt")).toBeVisible();
  });

  test("search by SKU shows matching product", async ({ page }) => {
    await page.goto("/search?q=JEANS-SLIM-32");

    await expect(page.getByRole("heading", { name: /Найдено:/ })).toBeVisible();
    await expect(page.getByText("Slim Fit Jeans")).toBeVisible();
  });

  test("search form submits query to results page", async ({ page }) => {
    await page.goto("/search");

    await page.getByLabel("Поиск по каталогу").fill("Running");
    await page.getByLabel("Поиск по каталогу").press("Enter");

    await expect(page).toHaveURL(/\/search\?q=Running/);
    await expect(page.getByText("Running Sneakers")).toBeVisible();
  });
});
