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
  await expect(page.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "System Settings" })).toBeVisible();
  await expect(page.getByText("Super Admin")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open notifications" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

  await page.goto("/admin/moderation");
  await expect(page.getByRole("heading", { name: "Flagging & Moderation" })).toBeVisible();

  await page.goto("/admin/community");
  await expect(page.getByRole("heading", { name: "Community Forum" })).toBeVisible();

  await page.goto("/admin/analytics");
  await expect(page.getByRole("heading", { name: "Analytics & Reporting" })).toBeVisible();

  await page.goto("/admin/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();

  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "System Settings" })).toBeVisible();
});

test.describe("admin shell mobile behavior", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sidebar is collapsible on small screens", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("password");
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole("button", { name: "Sign in" }).click()]);

    await page.goto("/admin");
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Overview" })).toBeHidden();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("button", { name: "Close navigation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();

    await page.getByRole("button", { name: "Close navigation" }).click();
    await expect(page.getByRole("link", { name: "Overview" })).toBeHidden();
  });
});
