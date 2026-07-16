import { expect, test } from "@playwright/test";

import { addPrimaryProductToCart, primaryAddToCartButton } from "./test-helpers";

/**
 * Full guest checkout via dev payment stub (ADR-006).
 * Requires API with seeded catalog — started by playwright webServer bootstrap.
 */
test.describe("Checkout stub smoke", () => {
  test("guest completes PDP → cart → stub pay → order confirmation", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await page.goto("/products/classic-white-t-shirt");
    await expect(primaryAddToCartButton(page)).toBeVisible();

    await addPrimaryProductToCart(page);

    await page.getByRole("button", { name: "Перейти к оформлению" }).click();
    await page.waitForURL("**/checkout");

    await expect(
      page.getByRole("heading", { name: "Оформление заказа" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Перейти к оплате" }).click();

    await expect(
      page.getByText("Тестовый режим оплаты: реальный платёжный провайдер не используется."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Оплатить (тест)" }).click();

    await page.waitForURL("**/checkout/confirmation**");
    await expect(page.getByText("Заказ подтверждён")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Номер заказа:\s*ORD-/)).toBeVisible();
  });
});
