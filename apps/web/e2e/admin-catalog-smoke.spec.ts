import { expect, test } from "@playwright/test";

/**
 * Admin catalog smoke (Sprint B).
 * Creates a draft product and verifies it is hidden from the public catalog.
 */
test.describe("Admin catalog smoke", () => {
  test("admin creates draft product hidden from storefront", async ({ page, request }) => {
    const slug = `e2e-draft-${Date.now()}`;

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("admin@localhost");
    await page.getByLabel("Пароль").fill("admin12345");
    await page.getByRole("button", { name: "Войти" }).click();
    await page.waitForURL("**/admin");

    await page.goto("/admin/catalog/new");
    await page.getByLabel("Название").fill(`E2E Draft ${slug}`);
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("SKU").fill(`SKU-${slug}`);
    await page.getByLabel("Цена (копейки/центы)").fill("1999");
    await page.getByLabel("Статус").selectOption("draft");
    await page.getByRole("button", { name: "Создать" }).click();

    await page.waitForURL("**/admin/catalog");
    await expect(page.getByText(slug)).toBeVisible();

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const publicList = await request.get(`${apiBase}/api/v1/products?limit=100`);
    expect(publicList.ok()).toBeTruthy();
    const body = (await publicList.json()) as { items: Array<{ slug: string }> };
    const slugs = body.items.map((item) => item.slug);
    expect(slugs).not.toContain(slug);
  });
});
