import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin UX Wave 12 smoke — color matrix + draft preview", () => {
  test("product edit shows color matrix for multi-color products", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1&needs_color_photos=1");

    const editLink = page.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products needing color photos in E2E seed");
      return;
    }

    await editLink.click();
    await expect(page).toHaveURL(/\/admin\/catalog\/.+\/edit/);
    await expect(page.getByLabel("Матрица цветов галереи")).toBeVisible();
  });

  test("product edit exposes draft preview button", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1&needs_styling=1");

    const editLink = page.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products needing styling in E2E seed");
      return;
    }

    await editLink.click();
    await expect(page.getByRole("button", { name: "Предпросмотр на витрине ↗" })).toBeVisible();
  });
});
