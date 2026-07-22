import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

test.describe("Admin customers smoke", () => {
  test("customers email search preserves query in URL", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/customers");
    await page.getByLabel("Поиск по клиентам").fill("example.com");
    await page.getByRole("button", { name: "Найти" }).click();
    await expect(page).toHaveURL(/q=example\.com/);
  });

  test("categories nav does not highlight products link", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/catalog/categories");
    const mobileMenu = page.getByRole("button", { name: "Меню админ-панели" });
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }
    const productsLink = page.getByRole("link", { name: "Товары" });
    await expect(productsLink).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Категории" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
