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

test("admin notifications page creates a broadcast and refreshes history", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/notifications");

  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await page.getByLabel("Title").fill("Maintenance advisory");
  await page.getByLabel("Audience").selectOption("students");
  await page.getByLabel("Message").fill("The platform will be unavailable from 10 PM to 10:15 PM.");
  await page.getByRole("button", { name: "Send notification" }).click();

  await expect(page.getByTestId("admin-notification-row").first()).toContainText(
    "Maintenance advisory"
  );
});

test("admin settings page updates an allowlisted setting value", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/settings");

  await expect(page.getByRole("heading", { name: "System Settings" })).toBeVisible();
  const row = page
    .getByTestId("admin-setting-row")
    .filter({ hasText: "forum_auto_lock_hours" })
    .first();
  await row.getByLabel("Setting value").fill("48");
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row).toContainText("48");
});
