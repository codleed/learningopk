import { expect, test } from "@playwright/test";

test("admin shell exposes phase-1 section navigation", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole("button", { name: "Sign in" }).click()]);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("link", { name: "User Management" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Flagging & Moderation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Content Management" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Community Forum" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Analytics & Reporting" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Notifications" })).toBeVisible();
  await expect(page.getByRole("link", { name: "System Settings" })).toBeVisible();
  await expect(page.getByText("Super Admin")).toBeVisible();

  for (const target of [
    "/admin/users",
    "/admin/moderation",
    "/admin/community",
    "/admin/analytics",
    "/admin/notifications",
    "/admin/settings"
  ]) {
    await page.goto(target);
    await expect(page.getByText("Coming in next sprint")).toBeVisible();
  }
});
