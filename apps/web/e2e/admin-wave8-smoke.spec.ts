import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin UX Wave 8 smoke — dashboard Action Center", () => {
  test("dashboard shows greeting and action center", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "Сводка" })).toBeVisible();
    await expect(page.getByText(/Добрый день,/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Требует внимания" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Операции" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Продажи" })).toBeVisible();
  });

  test("sales KPI cards link to orders list", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    await page.getByRole("link", { name: "Заказы сегодня" }).click();
    await expect(page).toHaveURL(/\/admin\/orders/);
  });

  test("dashboard quick actions navigate to catalog and import", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    await page.getByRole("link", { name: "Каталог", exact: true }).first().click();
    await expect(page).toHaveURL(/\/admin\/catalog/);

    await page.goto("/admin");
    await page.getByRole("link", { name: "Импорт", exact: true }).first().click();
    await expect(page).toHaveURL(/\/admin\/integrations\/moysklad\/import/);
  });
});
