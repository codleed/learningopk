// NOTE: not yet executed locally (docker stack unavailable); assertions verified
// against source reads. Run with: pnpm run test:e2e tests/e2e/admin-erp-access.spec.ts
import { expect, test, type Page } from "@playwright/test";

const BACKEND = "http://localhost:3001";

const loginAs = async (page: Page, email: string) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password");
  await Promise.all([
    page.waitForURL(/\/kitab\/today$/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
};

const ensureSchool = async (page: Page) => {
  const list = await page.request.get(`${BACKEND}/api/schools`);
  const body = await list.json();
  const raw = body?.data?.schools ?? body?.data;
  const schools = Array.isArray(raw) ? raw : [];
  if (schools.length > 0) return;
  const suffix = Date.now();
  const response = await page.request.post(`${BACKEND}/api/schools`, {
    data: {
      name: `E2E Access School ${suffix}`,
      board: "FBISE",
      principalName: "E2E Principal",
      principalEmail: `e2e-principal-${suffix}@example.com`,
      principalPassword: "password",
    },
  });
  if (!response.ok()) {
    throw new Error(`POST /api/schools failed: ${response.status()} ${await response.text()}`);
  }
};

test.describe("admin School ERP access", () => {
  test("admin can access /school/erp", async ({ page }) => {
    await loginAs(page, "admin@example.com");
    await ensureSchool(page);
    await page.goto("/school/erp");
    await expect(page).toHaveURL(/\/school\/erp$/);
    await expect(page.getByText("No school access")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Roles & Access" })).toBeVisible();
  });

  test("admin Index exposes School ERP entry", async ({ page }) => {
    await loginAs(page, "admin@example.com");
    const dialog = page.getByRole("dialog", { name: "Index" });
    await expect(async () => {
      await page.keyboard.press("ControlOrMeta+k");
      await expect(dialog).toBeVisible();
    }).toPass({ timeout: 10_000 });
    await expect(dialog.getByRole("link", { name: /School ERP/ })).toBeVisible();
  });

  test("student is blocked from /school/erp", async ({ page }) => {
    await loginAs(page, "ayesha.khan@example.com");
    await page.goto("/school/erp");
    await expect(page.getByRole("heading", { name: "No school access" })).toBeVisible();
  });
});
