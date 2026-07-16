import { expect, test } from "@playwright/test";

import { E2E_API_BASE, loginAsAdmin } from "./test-helpers";

/**
 * Admin catalog smoke (Sprint B).
 * Creates a draft product and verifies it is hidden from the public catalog.
 */
test.describe("Admin catalog smoke", () => {
  test("admin creates draft product hidden from storefront", async ({ page, request }) => {
    const slug = `e2e-draft-${Date.now()}`;

    await loginAsAdmin(page);

    await page.goto("/admin/catalog/new");
    await page.getByLabel("Название").fill(`E2E Draft ${slug}`);
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("SKU").fill(`SKU-${slug}`);
    await page.locator("#price_rub").fill("20");
    await page.getByLabel("Статус").selectOption("draft");
    await page.getByRole("button", { name: "Создать" }).click();

    await expect(page).toHaveURL(/\/admin\/catalog(\?all=1)?$/, { timeout: 15_000 });
    await page.goto("/admin/catalog?all=1");
    await expect(page.getByRole("cell", { name: slug, exact: true })).toBeVisible();

    const publicList = await request.get(`${E2E_API_BASE}/api/v1/products?limit=100`);
    expect(publicList.ok()).toBeTruthy();
    const body = (await publicList.json()) as { items: Array<{ slug: string }> };
    const slugs = body.items.map((item) => item.slug);
    expect(slugs).not.toContain(slug);
  });
});
