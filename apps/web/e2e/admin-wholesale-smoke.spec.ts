import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

/**
 * Admin wholesale customer management smoke (Sprint E).
 */
test.describe("Admin wholesale smoke", () => {
  test("admin can open customers list", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: "Клиенты" })).toBeVisible();
    await expect(page.getByText("wholesaler@example.com").first()).toBeVisible();
  });
});
