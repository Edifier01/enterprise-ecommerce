import { expect, test } from "@playwright/test";

/**
 * Wholesale pricing smoke (Sprint E).
 * Retail user must not see wholesale price; wholesaler sees dual pricing on PDP.
 */
test.describe("Wholesale pricing smoke", () => {
  test("retail user does not see wholesale price on PDP", async ({ page }) => {
    await page.goto("/products/classic-white-t-shirt");
    await expect(page.getByText("Опт:")).not.toBeVisible();
    await expect(page.getByText("Розница:")).not.toBeVisible();
  });

  test("wholesaler sees dual prices on PDP", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("wholesaler@example.com");
    await page.getByLabel("Пароль").fill("wholesale12345");
    await page.getByRole("button", { name: "Войти" }).click();
    await page.waitForURL("**/account**");

    await page.goto("/products/classic-white-t-shirt");
    await expect(page.getByText("Розница:")).toBeVisible();
    await expect(page.getByText("Опт:")).toBeVisible();
  });
});
