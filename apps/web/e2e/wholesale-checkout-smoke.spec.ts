import { expect, test } from "@playwright/test";

/**
 * Wholesaler checkout smoke (Sprint E).
 * Wholesaler pays wholesale price through stub checkout.
 */
test.describe("Wholesale checkout smoke", () => {
  test("wholesaler completes checkout at wholesale price", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto("/login");
    await page.getByLabel("Email").fill("wholesaler@example.com");
    await page.getByLabel("Пароль").fill("wholesale12345");
    await page.getByRole("button", { name: "Войти" }).click();
    await page.waitForURL("**/account**");

    await page.goto("/products/classic-white-t-shirt");
    await expect(page.getByText("Опт:")).toBeVisible();

    await page.getByRole("button", { name: "Купить" }).click();
    await page.waitForURL("**/cart", { timeout: 30_000 });

    await expect(page.getByRole("heading", { name: "Корзина" })).toBeVisible();
    await page.getByRole("button", { name: "Перейти к оформлению" }).click();
    await page.waitForURL("**/checkout");

    await page.getByRole("button", { name: "Перейти к оплате" }).click();
    await expect(
      page.getByText("Тестовый режим оплаты: реальный платёжный провайдер не используется.")
    ).toBeVisible();
    await page.getByRole("button", { name: "Оплатить (тест)" }).click();

    await page.waitForURL("**/checkout/confirmation**");
    await expect(page.getByText("Заказ подтверждён")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Номер заказа:\s*ORD-/)).toBeVisible();
  });
});
