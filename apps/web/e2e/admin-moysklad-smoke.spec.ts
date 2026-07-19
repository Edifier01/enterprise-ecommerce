import { expect, test } from "@playwright/test";

import { clickAdminCatalogEditLink, loginAsAdmin, visibleText } from "./test-helpers";

const E2E_MS_SLUG = "e2e-moysklad-synced-product";

/**
 * Admin MoySklad smoke — MS-synced product shows read-only operational fields.
 */
test.describe("Admin MoySklad smoke", () => {
  test("MS-synced product edit page shows read-only price and SKU", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/admin/catalog?all=1&q=${E2E_MS_SLUG}`);

    await expect(visibleText(page, E2E_MS_SLUG)).toBeVisible();
    await clickAdminCatalogEditLink(page, E2E_MS_SLUG);

    await expect(page).toHaveURL(/\/admin\/catalog\/[^/]+\/edit/, { timeout: 15_000 });
    await expect(page.getByText("Из МойСклад").first()).toBeVisible();
    await expect(
      page.getByText("Цены, SKU, остатки и модификации редактируются только в МойСклад."),
    ).toBeVisible();

    await expect(page.locator("#price_rub")).toHaveCount(0);
    await expect(page.getByText("(из МойСклад)")).toBeVisible();

    await expect(page.locator('input[name="sku"]')).toHaveCount(0);
    await expect(page.getByText("E2E-MS-SKU-001")).toBeVisible();

    await expect(page.getByLabel("Название (витрина)")).toBeEditable();
    await expect(page.getByLabel("Slug")).toBeEditable();
  });
});
