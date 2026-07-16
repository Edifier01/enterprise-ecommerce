import { expect, test } from "@playwright/test";

import { loginAsWholesaler, productDetailPanel } from "./test-helpers";

/**
 * Wholesale pricing smoke (Sprint E).
 * Retail user must not see wholesale price; wholesaler sees dual pricing on PDP.
 */
test.describe("Wholesale pricing smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("retail user does not see wholesale price on PDP", async ({ page }) => {
    await page.goto("/products/classic-white-t-shirt");
    await expect(page.getByText("Опт:")).not.toBeVisible();
    await expect(page.getByText("Розница:")).not.toBeVisible();
  });

  test("wholesaler sees dual prices on PDP", async ({ page }) => {
    await loginAsWholesaler(page);

    await page.goto("/products/classic-white-t-shirt");
    const detail = productDetailPanel(page, "Classic White T-Shirt");
    await expect(detail.getByText("Розница:")).toBeVisible();
    await expect(detail.getByText("Опт:")).toBeVisible();
  });
});
