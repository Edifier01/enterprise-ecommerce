import { expect, test, type Locator, type Page } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

const E2E_MS_SLUG = "e2e-moysklad-synced-product";
const E2E_MS_NAME = "E2E MoySklad Synced Jacket";

async function catalogProductScope(page: Page, productName: string): Promise<Locator> {
  const row = page.getByRole("row").filter({ hasText: productName });
  if ((await row.count()) > 0) {
    return row.first();
  }
  return page.getByRole("listitem").filter({ hasText: productName }).first();
}

/**
 * Admin Phase B — catalog visibility switch and bulk hide/show toolbar.
 */
test.describe("Admin catalog visibility smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("catalog list shows visibility toggle and bulk toolbar on selection", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/admin/catalog?all=1&q=${encodeURIComponent(E2E_MS_SLUG)}`);

    await expect(page.getByRole("heading", { name: "Все товары", level: 1 })).toBeVisible();

    const productScope = await catalogProductScope(page, E2E_MS_NAME);
    await expect(productScope).toBeVisible();

    const editLink = productScope.getByRole("link", { name: "Изменить" });
    if ((await editLink.count()) === 0) {
      test.skip(true, "E2E MoySklad product not found in catalog seed");
      return;
    }

    await expect(productScope.getByText(/^(Видим|Скрыт)$/)).toBeVisible();

    const visibilitySwitch = productScope.getByRole("switch");
    await expect(visibilitySwitch).toBeVisible();

    const wasVisible = (await visibilitySwitch.getAttribute("aria-checked")) === "true";
    if (wasVisible) {
      await expect(
        productScope.getByRole("button", { name: "Скрыть с витрины" }),
      ).toBeVisible();
    }

    const rowCheckbox = productScope.getByRole("checkbox", { name: /Выбрать/ });
    await rowCheckbox.check();

    await expect(page.getByRole("button", { name: "Скрыть выбранные" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Показать выбранные" })).toBeVisible();
    await expect(page.getByText(/^Выбрано: 1$/)).toBeVisible();

    await rowCheckbox.uncheck();

    await visibilitySwitch.click();
    await expect(visibilitySwitch).toHaveAttribute(
      "aria-checked",
      wasVisible ? "false" : "true",
      { timeout: 15_000 },
    );

    await visibilitySwitch.click();
    await expect(visibilitySwitch).toHaveAttribute(
      "aria-checked",
      wasVisible ? "true" : "false",
      { timeout: 15_000 },
    );
  });
});
