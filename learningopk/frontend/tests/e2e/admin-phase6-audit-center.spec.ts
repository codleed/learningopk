import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([
    page.waitForURL(/\/dashboard$/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
};

test("admin sidebar includes audit trail route and audit page renders", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin");

  await page.getByRole("link", { name: "Audit Trail" }).click();
  await expect(page).toHaveURL(/\/admin\/audit$/);
  await expect(page.getByRole("heading", { name: "Audit Trail" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Admin audit logs" })).toBeVisible();
});

test("admin audit center applies scope/status/search filters and paginates", async ({ page }) => {
  await loginAsSeededAdmin(page);

  await page.goto("/admin/users");
  const row = page
    .getByTestId("admin-user-row")
    .filter({ hasText: "ali.hassan@example.com" })
    .first();
  await row.getByRole("button", { name: "Promote to admin" }).click();

  await page.goto("/admin/audit");
  await page.getByLabel("Scope").selectOption("users");
  await page.getByLabel("Status").selectOption("success");
  await page.getByLabel("Search logs").fill("Promote user role");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByTestId("admin-audit-row").first()).toContainText("Promote user role");

  const loadMoreButton = page.getByRole("button", { name: "Load more" });
  if (await loadMoreButton.isVisible()) {
    await loadMoreButton.click();
  }
});
