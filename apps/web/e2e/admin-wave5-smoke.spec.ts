import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin UX Wave 5 smoke", () => {
  test("dashboard export alert links to filtered orders list", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    const exportAlert = page.getByRole("link", { name: "Экспорт заказов" });
    const hasAlert = await exportAlert.count();
    if (hasAlert > 0) {
      await exportAlert.click();
      await expect(page).toHaveURL(/export_pending=1/);
      await expect(page.getByRole("link", { name: "Ожидает экспорта в MS" })).toHaveClass(/font-medium/);
    }
  });

  test("orders export pending filter is available", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/orders?export_pending=1");
    await expect(page.getByRole("heading", { name: "Заказы" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ожидает экспорта в MS" })).toBeVisible();
  });
});
