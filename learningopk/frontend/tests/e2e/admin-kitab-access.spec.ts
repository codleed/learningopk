import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await Promise.all([
    page.waitForURL(/\/kitab\/today$/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
};

test.describe("admin kitab access", () => {
  test("legacy /dashboard 301s to the Kitab Today hub", async ({ page }) => {
    await loginAsSeededAdmin(page);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/kitab\/today$/);
    await expect(page.getByTestId("kitab-quietbar")).toBeVisible();
  });

  test("admin can reach the console and staff deep routes stay direct", async ({ page }) => {
    await loginAsSeededAdmin(page);

    await page.goto("/kitab/console");
    await expect(page).toHaveURL(/\/kitab\/console$/);
    await expect(page.getByTestId("kitab-quietbar")).toBeVisible();

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    await page.goto("/admin/content");
    await expect(page.getByRole("heading", { name: "Chapter Publishing" })).toBeVisible();
  });

  test("legacy /admin index 301s to the console while sub-pages resolve", async ({ page }) => {
    await loginAsSeededAdmin(page);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/kitab\/console$/);

    await page.goto("/admin/audit");
    await expect(page).toHaveURL(/\/admin\/audit$/);
  });
});
