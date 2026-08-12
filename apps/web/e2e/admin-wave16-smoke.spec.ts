import { expect, test } from "@playwright/test";

import { loginAsAdmin, openAdminCommandPalette } from "./test-helpers";

test.describe("Admin UX Wave 16 smoke — Phase 12 polish, a11y, E2E expansion", () => {
  test("catalog column picker toggles table columns", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1");

    const editLinks = page.getByRole("link", { name: "Изменить" });
    if ((await editLinks.count()) === 0) {
      test.skip(true, "No products in E2E seed");
      return;
    }

    const columnButton = page.getByRole("button", { name: "Настройка колонок таблицы" });
    await expect(columnButton).toBeVisible();
    await columnButton.click();
    await expect(columnButton).toHaveAttribute("aria-expanded", "true");

    const slugCheckbox = page.getByRole("checkbox", { name: "Slug" });
    if ((await slugCheckbox.count()) === 0) {
      test.skip(true, "Slug column not in catalog table");
      return;
    }

    await slugCheckbox.uncheck();
    await expect(page.getByRole("columnheader", { name: "Slug" })).toHaveCount(0);

    await slugCheckbox.check();
    await expect(page.getByRole("columnheader", { name: "Slug" })).toBeVisible();
  });

  test("product edit next-item link when queue has more products", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1&needs_styling=1");

    const editLink = page.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products needing styling in E2E seed");
      return;
    }

    await editLink.click();
    await expect(page).toHaveURL(/\/admin\/catalog\/.+\/edit\?from=/);

    const nextLink = page.getByRole("link", {
      name: "Следующий товар в очереди оформления",
    });
    const lastInQueue = page.getByText("Это последний товар в текущей очереди.");
    if ((await nextLink.count()) > 0) {
      await expect(nextLink).toBeVisible();
      return;
    }

    await expect(lastInQueue).toBeVisible();
  });

  test("product edit unsaved guard confirms on cancel", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1");

    const editLink = page.getByRole("link", { name: "Изменить" }).first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No products in E2E seed");
      return;
    }

    await editLink.click();

    const nameInput = page.getByLabel("Название (витрина)");
    await nameInput.fill(`${await nameInput.inputValue()} (тест)`);

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain("несохран");
      void dialog.dismiss();
    });
    await page.getByRole("link", { name: "Отмена" }).click({ noWaitAfter: true });
    await expect(page).toHaveURL(/\/admin\/catalog\/.+\/edit/);
  });

  test("command palette navigates to workflow merchandising view", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsAdmin(page);
    await page.goto("/admin");

    await openAdminCommandPalette(page);
    await page.getByPlaceholder("Поиск страниц, представлений, SKU, заказов…").fill("оформление");
    await page.getByRole("button", { name: /Оформление каталога/i }).click();

    await expect(page).toHaveURL(/\/admin\/catalog\/workflow/);
    await expect(page.getByRole("heading", { name: "Оформление товаров" })).toBeVisible();
  });

  test("command palette opens wholesale customers view", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsAdmin(page);
    await page.goto("/admin");

    await openAdminCommandPalette(page);
    await page.getByPlaceholder("Поиск страниц, представлений, SKU, заказов…").fill("оптовые");
    await page.getByRole("button", { name: /Оптовые клиенты/i }).click();

    await expect(page).toHaveURL(/\/admin\/customers\?wholesaler=true/);
  });
});
