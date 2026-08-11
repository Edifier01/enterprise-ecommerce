import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Admin UX Wave 15 smoke — mobile product edit IA", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("mobile edit shows section chips with large touch targets", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1");

    const editLink = page.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products in E2E seed");
      return;
    }

    await editLink.click();
    await expect(page).toHaveURL(/\/admin\/catalog\/.+\/edit/);

    const sectionNav = page.getByRole("navigation", { name: "Разделы карточки" });
    await expect(sectionNav).toBeVisible();

    const variantsButton = sectionNav.getByRole("button", { name: "Варианты" });
    await expect(variantsButton).toBeVisible();

    const box = await variantsButton.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await variantsButton.click();
    await expect(page.locator("#section-variants")).toBeInViewport();
  });

  test("mobile edit keeps save bar fixed while scrolling", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1");

    const editLink = page.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products in E2E seed");
      return;
    }

    await editLink.click();

    const saveButton = page.getByRole("button", { name: "Сохранить", exact: true });
    await expect(saveButton).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(saveButton).toBeInViewport();
  });

  test("mobile edit collapsible readiness panel", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1");

    const editLink = page.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products in E2E seed");
      return;
    }

    await editLink.click();

    const readinessSummary = page.getByText("Готовность к публикации").first();
    await expect(readinessSummary).toBeVisible();
  });
});
