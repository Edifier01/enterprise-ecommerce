import { expect, test } from "@playwright/test";

import { E2E_API_BASE, loginAsAdmin } from "./test-helpers";

/**
 * Admin category create smoke — category appears on public catalog after creation.
 */
test.describe("Admin categories smoke", () => {
  test("admin creates root category visible on storefront", async ({ page, request }) => {
    const slug = `e2e-cat-${Date.now()}`;
    const name = `E2E Category ${slug}`;

    await loginAsAdmin(page);

    await page.goto("/admin/catalog/categories");
    await page.getByLabel("Название").fill(name);
    await page.getByLabel(/Slug/i).fill(slug);
    await page.getByRole("button", { name: "Создать категорию" }).click();

    await expect(page.getByText("Категория создана")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();

    const publicCategories = await request.get(`${E2E_API_BASE}/api/v1/categories`);
    expect(publicCategories.ok()).toBeTruthy();
    const body = (await publicCategories.json()) as {
      items: Array<{ slug: string; name: string }>;
    };
    const slugs = body.items.map((item) => item.slug);
    expect(slugs).toContain(slug);
  });

  test("admin creates subcategory under root parent", async ({ page }) => {
    const ts = Date.now();
    const parentSlug = `e2e-parent-${ts}`;
    const childSlug = `e2e-child-${ts}`;

    await loginAsAdmin(page);
    await page.goto("/admin/catalog/categories");

    await page.getByLabel("Название").fill(`Parent ${ts}`);
    await page.getByLabel(/Slug/i).fill(parentSlug);
    await page.getByRole("button", { name: "Создать категорию" }).click();
    await expect(page.getByText("Категория создана")).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Название").fill(`Child ${ts}`);
    await page.getByLabel(/Slug/i).fill(childSlug);
    await page.locator("#cat-parent").selectOption({ label: `Parent ${ts}` });
    await page.getByRole("button", { name: "Создать категорию" }).click();
    await expect(page.getByText("Категория создана")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("cell", { name: `↳ Child ${ts}` })).toBeVisible();
  });
});
