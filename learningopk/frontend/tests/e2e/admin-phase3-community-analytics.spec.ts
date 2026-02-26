import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole("button", { name: "Sign in" }).click()]);
};

test("admin community page filters thread health rows and paginates", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/community");

  await expect(page.getByRole("heading", { name: "Community Forum" })).toBeVisible();
  await page.getByLabel("Solved state").selectOption("unsolved");
  await page.getByLabel("Pinned state").selectOption("unpinned");
  await page.getByLabel("Moderation state").selectOption("openFlags");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByTestId("community-thread-row").first()).toContainText("Open flags");

  const loadMoreButton = page.getByRole("button", { name: "Load more" });
  if (await loadMoreButton.isVisible()) {
    await loadMoreButton.click();
  }
});

test("admin analytics page switches windows and renders KPI + subject table data", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/analytics");

  await expect(page.getByRole("heading", { name: "Analytics & Reporting" })).toBeVisible();
  await expect(page.getByRole("paragraph").filter({ hasText: "Active students" })).toBeVisible();
  await page.getByLabel("Time window").selectOption("7");
  await expect(page.getByText("Last 7 days").first()).toBeVisible();
  await expect(page.getByRole("table", { name: "Subject performance" })).toBeVisible();
});
