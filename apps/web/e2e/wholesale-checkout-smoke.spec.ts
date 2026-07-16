import { expect, test } from "@playwright/test";

import {
  addPrimaryProductToCart,
  ensureCartEmpty,
  loginAsWholesaler,
  productDetailPanel,
} from "./test-helpers";

/**
 * Wholesaler checkout smoke (Sprint E).
 * Wholesaler pays wholesale price through stub checkout.
 */
test.describe("Wholesale checkout smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("wholesaler completes checkout at wholesale price", async ({ page }) => {
    test.setTimeout(90_000);

    await loginAsWholesaler(page);
    await ensureCartEmpty(page);

    await page.goto("/products/classic-white-t-shirt");
    await expect(page.getByRole("heading", { name: "Classic White T-Shirt" })).toBeVisible();
    const detail = productDetailPanel(page, "Classic White T-Shirt");
    await expect(detail.getByText("Опт:")).toBeVisible();

    await addPrimaryProductToCart(page, detail);

    await page.getByRole("button", { name: "Перейти к оформлению" }).click();
    await page.waitForURL("**/checkout");

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
