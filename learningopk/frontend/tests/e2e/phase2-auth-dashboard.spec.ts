import { expect, test, type Page } from "@playwright/test";

const registerAndOpenDashboard = async (baseEmail: string, page: Page) => {
  const timestamp = Date.now();
  const password = "StrongPass123";

  await page.goto("/register");
  await page.getByLabel("Name").fill("Phase 2 Student");
  await page.getByLabel("Degree").fill("Matriculation");
  await page.getByLabel("Board").selectOption("fbise");
  await page.getByLabel("Class").selectOption("9th");
  await page.getByLabel("Email").fill(`${baseEmail}_${timestamp}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByLabel("Primary navigation")).toBeVisible();
};

const getComputedColor = async (page: Page, cssColor: string) => {
  return page.evaluate((color) => {
    const sample = document.createElement("div");
    sample.style.backgroundColor = color;
    document.body.appendChild(sample);
    const computed = getComputedStyle(sample).backgroundColor;
    sample.remove();
    return computed;
  }, cssColor);
};

const getShellBackgroundColor = async (page: Page) => {
  const shell = page.locator("main#main-content > div.rounded-\\[1\\.6rem\\]").first();
  return shell.evaluate((element) => getComputedStyle(element).backgroundColor);
};
const getShellWrapper = (page: Page) => page.locator("main#main-content > div.rounded-\\[1\\.6rem\\]");

test("forgot password surfaces backend failures instead of false success", async ({ page }) => {
  await page.goto("/forgot-password");

  await page.getByLabel("Email").fill("phase2_reset_failure@example.com");
  await page.getByRole("button", { name: "Send reset instructions" }).click();

  await expect(page.getByText("Reset requests are not enabled on this server yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send reset instructions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).not.toBeVisible();
});

test("dashboard search, filter, and notifications controls are interactive", async ({ page }) => {
  await registerAndOpenDashboard("phase2_controls", page);

  await page.getByLabel("Search classes").fill("non-existent-subject-phase2");
  await page.getByRole("button", { name: "Apply search" }).click();

  await expect(page).toHaveURL(/q=non-existent-subject-phase2/);
  await expect(page.getByText("No courses match your current search/filter.")).toBeVisible();

  await page.getByRole("combobox", { name: "Filter courses" }).selectOption("completed");
  await page.getByRole("button", { name: "Apply filter" }).click();

  await expect(page).toHaveURL(/filter=completed/);
  await expect(page.getByText("Filter: Completed courses")).toBeVisible();

  await page.getByRole("button", { name: "Notifications" }).click();
  await expect(page.getByRole("heading", { name: "Recent notifications" })).toBeVisible();
});

test("dashboard and forum show left rail for authenticated students", async ({ page }) => {
  await registerAndOpenDashboard("phase2_left_rail", page);

  await expect(page.getByLabel("Primary navigation")).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Subjects", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Forum", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "AI Tutor", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

  await page.goto("/forum");
  await expect(page).toHaveURL(/\/forum$/);
  await expect(page.getByRole("heading", { name: "Forum" })).toBeVisible();
  await expect(page.getByLabel("Primary navigation")).toBeVisible();
  await expect(page.getByRole("link", { name: "Forum", exact: true })).toBeVisible();

  await page.goto("/ai-tutor");
  await expect(page).toHaveURL(/\/ai-tutor$/);
  await expect(page.getByRole("heading", { name: "AI Tutor", exact: true })).toBeVisible();
  await expect(page.getByLabel("Ask AI tutor")).toBeVisible();
  await expect(page.getByLabel("Chat history sidebar")).toBeVisible();
  await expect(page.getByRole("button", { name: "New Chat" })).toBeVisible();
});

test("left rail can collapse and expand on desktop", async ({ page }) => {
  await registerAndOpenDashboard("phase2_left_rail_collapse", page);

  const leftRail = page.getByTestId("left-rail");

  await expect(leftRail).toHaveAttribute("data-collapsed", "false");
  await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeVisible();
  await expect(leftRail.getByText("Dashboard", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Collapse sidebar" }).click();

  await expect(leftRail).toHaveAttribute("data-collapsed", "true");
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await expect(leftRail.getByText("Dashboard", { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "Expand sidebar" }).click();

  await expect(leftRail).toHaveAttribute("data-collapsed", "false");
  await expect(leftRail.getByText("Dashboard", { exact: true })).toBeVisible();
});

test("settings screen provides profile management and light/dark theme controls", async ({ page }) => {
  await registerAndOpenDashboard("phase2_settings", page);

  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Profile management" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Theme" })).toBeVisible();

  await expect(page.getByLabel("Name")).toHaveValue("Phase 2 Student");
  await expect(page.getByLabel("Class")).toHaveValue(/\S+/);
  await expect(page.getByLabel("Degree")).toHaveValue("Matriculation");
  await expect(page.getByLabel("Board")).toHaveValue(/\S+/);

  await page.getByLabel("Board").fill("bise-lahore");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile updated")).toBeVisible();

  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(true);

  await page.reload();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(true);

  await page.getByRole("button", { name: "Light theme" }).click();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(false);
});

test("subjects page lists subject cards with progress", async ({ page }) => {
  await registerAndOpenDashboard("phase2_subjects", page);

  await page.getByRole("link", { name: "Subjects", exact: true }).click();

  await expect(page).toHaveURL(/\/subjects$/);
  await expect(page.getByRole("heading", { name: "Subjects", exact: true })).toBeVisible();
  await expect(page.getByText("Physics")).toBeVisible();
  await expect(page.getByText("Chemistry")).toBeVisible();
  await expect(page.getByRole("img", { name: "Physics icon" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Chemistry icon" })).toBeVisible();
  await expect(page.getByText(/% complete/).first()).toBeVisible();

  await page.getByRole("link", { name: "Open Physics chapters" }).click();

  await expect(page).toHaveURL(/\/fbise\/9th\/physics$/);
  await expect(page.getByRole("heading", { name: "Physics", exact: true })).toBeVisible();
  await expect(page.getByText("Physical Quantities and Measurement")).toBeVisible();

  await page.getByRole("link", { name: "Open chapter" }).first().click();

  await expect(page).toHaveURL(/\/fbise\/9th\/physics\/physical-quantities-and-measurement/);
  await expect(page.getByRole("heading", { name: /Chapter 1:/, level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Summary", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Exercises", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Flashcards", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quiz", exact: true })).toBeVisible();
});

test("login and register keep left rail hidden for guests", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Primary navigation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);

  await page.goto("/register");
  await expect(page.getByLabel("Primary navigation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
});

test("bento auth shell presents standalone login and register pages", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  await expect(page.getByText("Bento Box", { exact: true })).toBeVisible();
  await expect(page.getByText("Or continue with")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
  await expect(page.getByText(/all rights reserved/i)).toBeVisible();
  await expect(page.getByLabel("Primary navigation")).toHaveCount(0);

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create your student account" })).toBeVisible();
  await expect(page.getByText("Bento Box", { exact: true })).toBeVisible();
  await expect(page.getByText(/terms of service/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText(/all rights reserved/i)).toBeVisible();
  await expect(page.getByLabel("Primary navigation")).toHaveCount(0);
});

test("learn screens keep shell background theme-aware in dark mode", async ({ page }) => {
  await registerAndOpenDashboard("phase2_dark_learn_shell", page);

  await page.evaluate(() => {
    window.localStorage.setItem("learningopk-theme", "dark");
  });
  await page.reload();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(true);

  await page.goto("/fbise/9th/physics");
  await expect(page.getByRole("heading", { name: "Physics", exact: true })).toBeVisible();

  const secondaryColor = await getComputedColor(page, "var(--secondary)");
  const subjectShellBackground = await getShellBackgroundColor(page);
  expect(subjectShellBackground).toBe(secondaryColor);

  await page.getByRole("link", { name: "Open chapter" }).first().click();
  await expect(page).toHaveURL(/\/fbise\/9th\/physics\/[^/]+/);
  await expect(page.getByRole("heading", { name: /Chapter 1:/ })).toBeVisible();
  await expect(getShellWrapper(page)).toHaveCount(0);
});

