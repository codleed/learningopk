import { expect, test, type Page } from "@playwright/test";

const registerAndOpenForum = async (baseEmail: string, page: Page) => {
  const timestamp = Date.now();
  const password = "StrongPass123";

  await page.goto("/register");
  await page.getByLabel("Name").fill("Forum Chrome Student");
  await page.getByLabel("Degree").fill("Matriculation");
  await page.getByLabel("Board").selectOption("fbise");
  await page.getByLabel("Class").selectOption("9th");
  await page.getByLabel("Email").fill(`${baseEmail}_${timestamp}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/forum");
  await expect(page).toHaveURL(/\/forum$/);
};

const getShellWrapper = (page: Page) => page.locator("main#main-content > div.rounded-\\[1\\.6rem\\]");

const assertNoHorizontalOverflow = async (page: Page) => {
  await page.waitForLoadState("domcontentloaded");
  const hasOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    if (!root) {
      return false;
    }

    return root.scrollWidth > window.innerWidth + 1;
  });
  expect(hasOverflow).toBeFalsy();
};

test("forum keeps dashboard shell styling while showing authenticated left rail", async ({ page }) => {
  await registerAndOpenForum("phase1_forum_chrome", page);

  await expect(page.getByTestId("dashboard-chrome-shell")).toBeVisible();
  await expect(page.getByTestId("dashboard-chrome-header")).toBeVisible();

  await expect(page.getByLabel("Primary navigation")).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Subjects", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Forum", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

  await page.getByPlaceholder("Search threads...").fill("phase1-filter-check");
  await page.getByPlaceholder("Search threads...").press("Enter");
  await expect(page).toHaveURL(/q=phase1-filter-check/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("forum shell background is theme-aware in dark mode", async ({ page }) => {
  await registerAndOpenForum("phase1_forum_dark_shell", page);

  await page.evaluate(() => {
    window.localStorage.setItem("learningopk-theme", "dark");
  });
  await page.reload();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(true);

  await expect(page.getByTestId("dashboard-chrome-shell")).toBeVisible();

  await expect(getShellWrapper(page)).toHaveCount(0);
});

test.describe("forum mobile layout", () => {
  test.use({
    viewport: { width: 390, height: 844 }
  });

  test("forum dashboard shell avoids horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/forum");

    await expect(page.getByTestId("dashboard-chrome-shell")).toBeVisible();
    await expect(page.getByTestId("dashboard-chrome-header")).toBeVisible();
    await expect(page.getByLabel("Primary navigation")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);

    await page.getByPlaceholder("Search threads...").fill("mobile-phase1-check");
    await page.getByPlaceholder("Search threads...").press("Enter");
    await expect(page).toHaveURL(/q=mobile-phase1-check/);

    await assertNoHorizontalOverflow(page);
  });
});

