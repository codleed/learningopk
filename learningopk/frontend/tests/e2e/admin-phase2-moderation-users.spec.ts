import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole("button", { name: "Sign in" }).click()]);
};

test("admin moderation queue filters open/resolved and resolves an open flag", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/moderation");

  await expect(page.getByRole("heading", { name: "Flagging & Moderation" })).toBeVisible();
  await page.getByLabel("Status").selectOption("open");
  await page.getByLabel("Target type").selectOption("thread");

  const firstOpenRow = page.getByTestId("moderation-row").first();
  await expect(firstOpenRow).toContainText("Open");

  await firstOpenRow.getByRole("button", { name: "Resolve" }).click();
  await page.getByLabel("Resolution note").fill("This report was reviewed and valid corrective action was taken.");
  await page.getByRole("button", { name: "Resolve flag" }).click();

  await expect(firstOpenRow).toHaveCount(0);
  await page.getByLabel("Status").selectOption("resolved");
  await expect(page.getByText("This report was reviewed and valid corrective action was taken.")).toBeVisible();
});

test("admin users directory supports text search and role filtering", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/users");

  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await page.getByLabel("Search users").fill("admin@example.com");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("cell", { name: "admin@example.com" })).toBeVisible();

  await page.getByLabel("Role").selectOption("student");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("cell", { name: "admin@example.com" })).toHaveCount(0);
});
