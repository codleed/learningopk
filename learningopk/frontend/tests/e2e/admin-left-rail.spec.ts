import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await Promise.all([
    page.waitForURL(/\/dashboard$/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
};

test.describe("admin left rail", () => {
  test("admin sees unified left rail with all navigation links", async ({ page }) => {
    await loginAsSeededAdmin(page);

    await expect(page.getByTestId("left-rail")).toBeVisible();

    await expect(page.getByLabel("Primary navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Subjects", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forum", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  });

  test("admin can navigate to admin section via left rail", async ({ page }) => {
    await loginAsSeededAdmin(page);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Admin", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
  });

  test("admin left rail persists across admin sub-pages", async ({ page }) => {
    await loginAsSeededAdmin(page);

    await page.goto("/admin/users");
    await expect(page.getByTestId("left-rail")).toBeVisible();
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    await page.goto("/admin/content");
    await expect(page.getByTestId("left-rail")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chapter Publishing" })).toBeVisible();

    await page.goto("/admin/audit");
    await expect(page.getByTestId("left-rail")).toBeVisible();
  });

  test("admin can collapse and expand left rail", async ({ page }) => {
    await loginAsSeededAdmin(page);
    await page.goto("/admin");

    const leftRail = page.getByTestId("left-rail");
    await expect(leftRail).toBeVisible();

    const collapseButton = page.getByRole("button", { name: /collapse|expand/i });
    await collapseButton.click();

    await expect(leftRail).toHaveAttribute("data-collapsed", "true");

    await collapseButton.click();
    await expect(leftRail).toHaveAttribute("data-collapsed", "false");
  });

  test("admin left rail shows Admin link as active on admin pages", async ({ page }) => {
    await loginAsSeededAdmin(page);

    await page.goto("/admin");
    const adminLink = page.getByRole("link", { name: "Admin", exact: true });
    await expect(adminLink).toHaveAttribute("aria-current", "page");
  });
});
