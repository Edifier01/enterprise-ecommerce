import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin UX Wave 13 smoke — MS variant synced fields", () => {
  test("MS product edit shows field-local MoySklad lock labels on variants", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1");

    const editLink = page.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products in E2E seed");
      return;
    }

    await editLink.click();
    await expect(page).toHaveURL(/\/admin\/catalog\/.+\/edit/);

    const variantsSection = page.locator("#section-variants");
    await variantsSection.scrollIntoViewIfNeeded();

    const msBlock = variantsSection.getByText("Данные из МойСклад").first();
    const hasMsProduct = await msBlock.count();
    if (hasMsProduct === 0) {
      test.skip(true, "First product is not MoySklad-synced in E2E seed");
      return;
    }

    await expect(msBlock).toBeVisible();
    await expect(variantsSection.getByLabel("Управляется МойСклад").first()).toBeVisible();
    await expect(variantsSection.getByText("Настройки витрины")).toBeVisible();
    await expect(
      variantsSection.getByRole("button", { name: "Сохранить настройки витрины" }).first(),
    ).toBeVisible();
  });
});
