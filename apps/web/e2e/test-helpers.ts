import { expect, type Locator, type Page } from "@playwright/test";

const E2E_API_PORT = process.env.E2E_API_PORT ?? "8001";

export const E2E_API_BASE =
  process.env.E2E_API_URL ?? `http://localhost:${E2E_API_PORT}`;

export const DEV_ADMIN_EMAIL = "admin@example.com";
export const DEV_ADMIN_PASSWORD = "admin12345";

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(DEV_ADMIN_EMAIL);
  await page.getByLabel("Пароль").fill(DEV_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

export async function loginAsWholesaler(page: Page) {
  await page.goto("/login");
  const form = page.locator("form").filter({ has: page.getByLabel("Email") }).first();
  await form.getByLabel("Email").fill("wholesaler@example.com");
  await form.getByLabel("Пароль").fill("wholesale12345");
  await form.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
  await expect(page.locator('a[href="/account"]')).toBeVisible({ timeout: 15_000 });
}

export async function ensureCartEmpty(page: Page) {
  const response = await page.request.get(`${E2E_API_BASE}/api/v1/cart`);
  if (!response.ok()) {
    return;
  }

  const cart = (await response.json()) as { lines: Array<{ id: string }> };
  for (const line of cart.lines) {
    await page.request.delete(`${E2E_API_BASE}/api/v1/cart/lines/${line.id}`);
  }
}

export function productDetailPanel(page: Page, productName: string): Locator {
  return page
    .getByRole("heading", { name: productName, level: 1 })
    .locator("xpath=ancestor::div[contains(@class,'grid')]/div[2]");
}

export function primaryAddToCartButton(page: Page, scope?: Locator) {
  const root = scope ?? page;
  const button = root.getByRole("button", { name: /^(В корзину|Купить)$/ });
  return scope ? button : button.first();
}

async function openPrimaryProductDetail(page: Page) {
  const buyLink = page.getByRole("link", { name: "Купить" }).first();
  if (await buyLink.isVisible()) {
    await buyLink.click();
  } else {
    await page.getByRole("article").first().locator("a.line-clamp-2").click();
  }
  await expect(page).toHaveURL(/\/products\//, { timeout: 15_000 });
}

export function pageSearchInput(page: Page) {
  return page.getByPlaceholder("Название...");
}

export function productResultLink(page: Page, productName: string) {
  return page
    .getByRole("article")
    .locator("a.line-clamp-2")
    .filter({ hasText: productName });
}

export async function addPrimaryProductToCart(page: Page, scope?: Locator) {
  if (!scope && !page.url().includes("/products/")) {
    const addButton = primaryAddToCartButton(page);
    if ((await addButton.count()) === 0 || !(await addButton.isVisible())) {
      await openPrimaryProductDetail(page);
    }
  }

  const button = primaryAddToCartButton(page, scope);
  await expect(button).toBeEnabled({ timeout: 10_000 });

  const cartAddResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/cart/lines") &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: 30_000 },
  );
  await Promise.all([cartAddResponse, button.click()]);

  await page.goto("/cart");
  await expect(page.getByRole("button", { name: "Перейти к оформлению" })).toBeVisible({
    timeout: 30_000,
  });
}
