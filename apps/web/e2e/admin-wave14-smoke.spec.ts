import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin UX Wave 14 smoke — customers filters and status badges", () => {
  test("customers page shows type filters and status badges", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/customers");

    await expect(page.getByRole("heading", { name: "Клиенты" })).toBeVisible();
    const typeFilters = page.getByRole("navigation", { name: "Сохранённые представления" });
    await expect(typeFilters.getByRole("link", { name: "Все", exact: true })).toBeVisible();
    await expect(typeFilters.getByRole("link", { name: "Опт", exact: true })).toBeVisible();
    await expect(typeFilters.getByRole("link", { name: "Розница", exact: true })).toBeVisible();

    const typeBadges = page.getByText("Опт", { exact: true }).or(
      page.getByText("Розница", { exact: true }),
    );
    if ((await typeBadges.count()) === 0) {
      test.skip(true, "No customers in E2E seed");
      return;
    }

    await expect(typeBadges.first()).toBeVisible();

    await page.getByRole("link", { name: "Опт", exact: true }).click();
    await expect(page).toHaveURL(/wholesaler=true/);

    await page.getByRole("link", { name: "Розница", exact: true }).click();
    await expect(page).toHaveURL(/wholesaler=false/);
  });

  test("orders list uses unified status badges", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/orders");

    const orderLink = page.getByRole("link", { name: /^ORD-/ }).first();
    if ((await orderLink.count()) === 0) {
      test.skip(true, "No orders in E2E seed");
      return;
    }

    await expect(
      page
        .getByText("Ожидает", { exact: true })
        .or(page.getByText("Подтверждён", { exact: true }))
        .or(page.getByText("Отправлен", { exact: true }))
        .or(page.getByText("Отменён", { exact: true }))
        .first(),
    ).toBeVisible();
  });
});
