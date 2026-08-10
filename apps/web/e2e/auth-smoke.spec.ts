import { expect, test } from "@playwright/test";

import { E2E_API_BASE } from "./test-helpers";

test.describe("Customer auth smoke", () => {
  test("register page shows email and password confirm fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Регистрация" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Пароль", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Повторите пароль")).toBeVisible();
  });

  test("wholesale register page shows password confirm field", async ({ page }) => {
    await page.goto("/register/wholesale");
    await expect(page.getByRole("heading", { name: "Регистрация оптовика" })).toBeVisible();
    await expect(page.getByLabel("Повторите пароль")).toBeVisible();
  });

  test("register submit redirects to check-email", async ({ page }) => {
    const email = `e2e-register-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill("secret12345");
    await page.getByLabel("Повторите пароль").fill("secret12345");
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await expect(page).toHaveURL(new RegExp(`/register/check-email\\?email=${encodeURIComponent(email)}`));
    await expect(page.getByRole("heading", { name: "Проверьте почту" })).toBeVisible();
  });

  test("verify-email without token shows error", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page.getByRole("heading", { name: "Ошибка подтверждения" })).toBeVisible();
  });

  test("verify-email with invalid token shows invalid message", async ({ page }) => {
    await page.goto("/verify-email?token=invalid-token-for-e2e-test-case");
    await expect(page.getByRole("heading", { name: "Ошибка подтверждения" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Перейти ко входу" })).toBeVisible();
  });

  test("forgot-password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: "Восстановление пароля" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Отправить ссылку" })).toBeVisible();
  });

  test("reset-password without token shows error", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText("Ссылка недействительна — токен не найден.")).toBeVisible();
  });

  test("login shows reset success banner", async ({ page }) => {
    await page.goto("/login?reset=success");
    await expect(
      page.getByText("Пароль успешно изменён. Войдите с новым паролем."),
    ).toBeVisible();
  });

  test("unverified login shows resend block with prefilled email", async ({ page, request }) => {
    const email = `e2e-unverified-${Date.now()}@example.com`;
    const registerResponse = await request.post(`${E2E_API_BASE}/api/v1/auth/register`, {
      data: { email, password: "secret12345" },
    });
    expect(registerResponse.ok()).toBeTruthy();

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль").fill("secret12345");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page.getByText("Подтвердите email перед входом")).toBeVisible();
    await expect(page.getByRole("button", { name: "Отправить письмо повторно" })).toBeVisible();
    await expect(page.locator("#resend-email")).toHaveValue(email);
  });
});
