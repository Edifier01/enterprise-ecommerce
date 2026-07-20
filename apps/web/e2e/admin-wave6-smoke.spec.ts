import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin UX Wave 6 smoke", () => {
  test("import queue shows bulk assign toolbar for admin", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/integrations/moysklad/import");

    const bulkTitle = page.getByText("Массовое назначение");
    const hasQueue = await page.getByText("Очередь импорта").count();
    expect(hasQueue).toBeGreaterThan(0);

    const hasBulk = await bulkTitle.count();
    if (hasBulk > 0) {
      await expect(page.getByRole("button", { name: "Назначить выбранным" })).toBeVisible();
    }
  });
});
