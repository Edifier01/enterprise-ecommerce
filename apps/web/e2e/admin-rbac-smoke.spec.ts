import { expect, test } from "@playwright/test";

import { loginAsAdmin, loginAsViewerAdmin } from "./test-helpers";

const FORBIDDEN_MESSAGE = "Недостаточно прав для просмотра этой страницы.";

test.describe("Admin viewer RBAC smoke", () => {
  test("viewer can open orders and inventory", async ({ page }) => {
    await loginAsViewerAdmin(page);

    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Заказы" })).toBeVisible();

    await page.goto("/admin/inventory");
    await expect(page.getByRole("heading", { name: "Склад" })).toBeVisible();
  });

  test("viewer can open customers", async ({ page }) => {
    await loginAsViewerAdmin(page);

    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: "Клиенты" })).toBeVisible();
  });

  test("viewer is blocked from catalog categories", async ({ page }) => {
    await loginAsViewerAdmin(page);

    await page.goto("/admin/catalog/categories");
    await expect(page.getByText(FORBIDDEN_MESSAGE)).toBeVisible();
  });

  test("viewer is blocked from MoySklad import queue", async ({ page }) => {
    await loginAsViewerAdmin(page);

    await page.goto("/admin/integrations/moysklad/import");
    await expect(page.getByText(FORBIDDEN_MESSAGE)).toBeVisible();
  });

  test("MFA security settings route is absent post-removal", async ({ page }) => {
    await loginAsAdmin(page);

    const response = await page.goto("/admin/settings/security");
    expect(response?.status()).toBe(404);
  });
});
