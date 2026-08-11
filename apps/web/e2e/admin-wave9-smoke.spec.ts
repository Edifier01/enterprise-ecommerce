import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin UX Wave 9 smoke — catalog bulk + quick edit", () => {
  test("catalog list shows bulk toolbar actions when rows selected", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1");

    await expect(page.getByRole("heading", { name: "Все товары" })).toBeVisible();

    const firstCheckbox = page.getByRole("checkbox", { name: "Выбрать строку" }).first();
    const hasRows = await firstCheckbox.count();
    if (hasRows === 0) {
      test.skip();
      return;
    }

    await firstCheckbox.check();
    await expect(page.getByText(/Выбрано: 1/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Назначить категорию" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Опубликовать", exact: true })).toBeVisible();
  });

  test("catalog list exposes inline status quick edit for admin", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1");

    const statusSelect = page.getByLabel("Статус товара").first();
    const hasSelect = await statusSelect.count();
    if (hasSelect === 0) {
      test.skip();
      return;
    }

    await expect(statusSelect).toBeVisible();
  });
});
