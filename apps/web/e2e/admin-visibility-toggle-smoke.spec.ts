import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./test-helpers";

/**
 * Admin Phase B — catalog visibility switch and bulk hide/show toolbar.
 */
test.describe("Admin catalog visibility smoke", () => {
  test("catalog list shows visibility toggle and bulk toolbar on selection", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/catalog?all=1");

    await expect(page.getByRole("heading", { name: "Все товары", level: 1 })).toBeVisible();

    const editLinks = page.getByRole("link", { name: "Изменить" });
    if ((await editLinks.count()) === 0) {
      test.skip(true, "Empty catalog in E2E seed — no products to test visibility");
      return;
    }

    const main = page.getByRole("main");
    await expect(main.getByText(/^(Видим|Скрыт)$/).first()).toBeVisible();

    const visibilitySwitch = page.getByRole("switch").first();
    await expect(visibilitySwitch).toBeVisible();

    const wasVisible = (await visibilitySwitch.getAttribute("aria-checked")) === "true";
    if (wasVisible) {
      await expect(page.getByRole("button", { name: "Скрыть с витрины" }).first()).toBeVisible();
    }

    const rowCheckbox = page.getByRole("checkbox", { name: /Выбрать/ }).first();
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
