import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin UX Wave 11 smoke — product edit section nav + publish guard", () => {
  test("product edit shows sticky section navigation on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1&needs_styling=1");

    const editLink = page.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products needing styling in E2E seed");
      return;
    }

    await editLink.click();
    await expect(page).toHaveURL(/\/admin\/catalog\/.+\/edit/);

    const sectionNav = page.getByRole("navigation", { name: "Разделы карточки" });
    await expect(sectionNav).toBeVisible();
    await expect(sectionNav.getByRole("button", { name: "Основное" })).toBeVisible();
    await expect(sectionNav.getByRole("button", { name: "Варианты" })).toBeVisible();
  });

  test("product edit warns when publish blockers prevent active status", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1&needs_styling=1");

    const editLink = page.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products needing styling in E2E seed");
      return;
    }

    await editLink.click();
    await expect(page).toHaveURL(/\/admin\/catalog\/.+\/edit/);

    const readinessHeading = page.getByRole("heading", { name: "Готовность к публикации" });
    const hasReadiness = await readinessHeading.count();
    if (hasReadiness === 0) {
      test.skip(true, "Product already ready to publish in E2E seed");
      return;
    }

    await expect(page.getByText(/Публикация недоступна:/)).toBeVisible();
    const statusSelect = page.getByLabel("Статус");
    await expect(statusSelect.locator('option[value="active"]')).toBeDisabled();
  });
});
