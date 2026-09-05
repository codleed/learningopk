import { expect, test, type Page } from "@playwright/test";

const registerStudent = async (timestamp: number, page: Page) => {
  const password = "StrongPass123";

  await page.goto("/register");
  await page.getByLabel("Name").fill("Stats Screen Student");
  await page.getByLabel("Degree").fill("Matriculation");
  await page.getByLabel("Board").selectOption("fbise");
  await page.getByLabel("Class").selectOption("9th");
  await page.getByLabel("Email").fill(`stats_screen_${timestamp}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test("dedicated stats screen renders key sections for authenticated users", async ({ page }) => {
  const timestamp = Date.now();

  await registerStudent(timestamp, page);

  await page.goto("/stats");

  await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Daily Streak Heatmap" })).toBeVisible();
  await expect(page.getByTestId("daily-streak-heatmap")).toBeVisible();
  await expect(page.getByTestId("daily-streak-heatmap").locator("svg").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Subject-wise Progress" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Goal Tracker" })).toBeVisible();
});
