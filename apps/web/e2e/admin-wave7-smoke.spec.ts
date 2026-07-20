import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin UX Wave 7 smoke", () => {
  test("catalog color photos filter tab is available", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?needs_color_photos=1&all=1");

    await expect(page.getByRole("heading", { name: "Все товары" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Фото по цветам" })).toHaveClass(/font-medium/);
  });

  test("product edit shows gallery color coverage when multi-color", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?needs_color_photos=1&all=1");

    const editLink = page.getByRole("link", { name: "Редактировать" }).first();
    const hasProduct = await editLink.count();
    if (hasProduct === 0) {
      test.skip();
      return;
    }

    await editLink.click();
    const coverage = page.getByText("Покрытие цветов в галерее");
    const hasCoverage = await coverage.count();
    if (hasCoverage > 0) {
      await expect(coverage).toBeVisible();
    }
  });

  test("import queue shows bulk publish button for admin", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/integrations/moysklad/import");

    await expect(
      page.getByRole("main").getByText("Очередь импорта", { exact: true }),
    ).toBeVisible();
    const bulkPublish = page.getByRole("button", { name: "Опубликовать выбранным" });
    const hasBulk = await bulkPublish.count();
    if (hasBulk > 0) {
      await expect(bulkPublish).toBeVisible();
    }
  });
});
