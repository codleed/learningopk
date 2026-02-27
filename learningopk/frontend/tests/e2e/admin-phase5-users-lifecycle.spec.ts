import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole("button", { name: "Sign in" }).click()]);
};

test("admin users page role lifecycle promotes and demotes a target user", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/users");

  const row = page.getByTestId("admin-user-row").filter({ hasText: "ali.hassan@example.com" }).first();
  await row.getByRole("button", { name: "Promote to admin" }).click();
  await expect(row).toContainText("admin");

  await row.getByRole("button", { name: "Demote to student" }).click();
  await expect(row).toContainText("student");
});

test("admin users page suspend lifecycle suspends and reactivates a student with required reason", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/users");

  const row = page.getByTestId("admin-user-row").filter({ hasText: "ali.hassan@example.com" }).first();
  await row.getByRole("button", { name: "Suspend" }).click();
  await page.getByLabel("Suspension reason").fill("Repeated policy violations requiring temporary suspension.");
  await page.getByRole("button", { name: "Confirm suspension" }).click();
  await expect(row).toContainText("suspended");

  await row.getByRole("button", { name: "Reactivate" }).click();
  await expect(row).toContainText("active");
});
