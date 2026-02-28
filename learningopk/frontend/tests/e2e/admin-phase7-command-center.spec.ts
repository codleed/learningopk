import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole("button", { name: "Sign in" }).click()]);
};

test("admin command center renders live KPIs and recent activity", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
  await expect(page.getByTestId("admin-overview-kpi-open-flags")).toBeVisible();
  await expect(page.getByTestId("admin-overview-kpi-suspended-users")).toBeVisible();
  await expect(page.getByTestId("admin-overview-kpi-failed-actions")).toBeVisible();
  await expect(page.getByTestId("admin-overview-kpi-notifications")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent admin activity" })).toBeVisible();
});

test("admin command center supports time window filter and refresh", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin");

  await page.getByLabel("Time window").selectOption("7");
  await page.getByLabel("Time window").selectOption("30");
  await page.getByLabel("Time window").selectOption("90");
  await page.getByRole("button", { name: "Refresh" }).click();

  await expect(page.getByTestId("admin-overview-kpi-open-flags")).toBeVisible();
});

test("admin command center shows high-priority alerts and deep links", async ({ page, request }) => {
  await loginAsSeededAdmin(page);

  for (let index = 0; index < 5; index += 1) {
    const response = await request.post("http://localhost:3001/api/admin/users/user_admin_001/role", {
      data: {
        role: "student"
      }
    });
    expect(response.status()).toBe(409);
  }

  await page.goto("/admin");
  await page.getByRole("button", { name: "Refresh" }).click();

  await expect(page.getByTestId("admin-overview-alert-banner")).toBeVisible();

  await page.getByTestId("admin-overview-kpi-failed-actions-link").click();
  await expect(page).toHaveURL(/\/admin\/audit/);

  await page.goto("/admin");
  await page.getByTestId("admin-overview-activity-link").first().click();
  await expect(page).toHaveURL(/\/admin\/(content|community|moderation|users|notifications|settings)/);
});
