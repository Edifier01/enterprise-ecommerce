import { expect, test } from "@playwright/test";

import { clickAdminCatalogEditLink, loginAsAdmin } from "./test-helpers";

const E2E_MS_SLUG = "e2e-moysklad-synced-product";
const E2E_MS_NAME = "E2E MoySklad Synced Jacket";

/**
 * Admin Phase B — product edit description field persists on «Сохранить» (stay).
 */
test.describe("Admin product description save smoke", () => {
  test("product edit saves description with stay intent", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/admin/catalog?all=1&q=${encodeURIComponent(E2E_MS_SLUG)}`);

    const editLinks = page.getByRole("link", { name: "Изменить" });
    if ((await editLinks.count()) === 0) {
      test.skip(true, "E2E MoySklad product not found in catalog seed");
      return;
    }

    await clickAdminCatalogEditLink(page, E2E_MS_NAME);
    await expect(page).toHaveURL(/\/admin\/catalog\/[^/]+\/edit/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Редактирование товара", level: 1 }),
    ).toBeVisible();

    const descriptionField = page.getByLabel("Описание");
    await expect(descriptionField).toBeVisible();

    const originalDescription = await descriptionField.inputValue();
    const marker = `\n<!-- e2e-desc-${Date.now()} -->`;

    await descriptionField.fill(originalDescription + marker);
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();

    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "Товар сохранён" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/admin\/catalog\/[^/]+\/edit/);

    await page.reload();
    await expect(page.getByLabel("Описание")).toHaveValue(originalDescription + marker);

    await page.getByLabel("Описание").fill(originalDescription);
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Товар сохранён" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
