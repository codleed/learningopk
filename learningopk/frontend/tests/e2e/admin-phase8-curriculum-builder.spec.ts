import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole("button", { name: "Sign in" }).click()]);
};

test("admin content renders curriculum builder controls", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");

  await expect(page.getByRole("heading", { name: "Curriculum Builder" })).toBeVisible();
  await expect(page.getByTestId("curriculum-board-form")).toBeVisible();
  await expect(page.getByTestId("curriculum-class-form")).toBeVisible();
  await expect(page.getByTestId("curriculum-subject-form")).toBeVisible();
  await expect(page.getByTestId("curriculum-chapter-form")).toBeVisible();
  await expect(page.getByTestId("curriculum-tree")).toBeVisible();
});

test("admin can create board class subject chapter using curriculum builder", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");

  const suffix = Date.now().toString();
  const boardName = `E2E Board ${suffix}`;
  const className = `11th ${suffix}`;
  const subjectName = `E2E Physics ${suffix}`;
  const chapterTitle = `Kinematics ${suffix}`;

  await page.getByTestId("curriculum-board-name-input").fill(boardName);
  await page.getByTestId("curriculum-board-submit").click();

  await page.getByTestId("curriculum-class-board-select").selectOption({ label: boardName });
  await page.getByTestId("curriculum-class-name-input").fill(className);
  await page.getByTestId("curriculum-class-submit").click();

  await page
    .getByTestId("curriculum-subject-class-select")
    .selectOption({ label: `${boardName} / ${className}` });
  await page.getByTestId("curriculum-subject-name-input").fill(subjectName);
  await page.getByTestId("curriculum-subject-submit").click();

  await page
    .getByTestId("curriculum-chapter-subject-select")
    .selectOption({ label: `${boardName} / ${className} / ${subjectName}` });
  await page.getByTestId("curriculum-chapter-number-input").fill("1");
  await page.getByTestId("curriculum-chapter-title-input").fill(chapterTitle);
  await page.getByTestId("curriculum-chapter-summary-input").fill("Chapter summary for e2e coverage.");
  await page.getByTestId("curriculum-chapter-submit").click();

  await expect(page.getByTestId("curriculum-tree")).toContainText(boardName);
  await expect(page.getByTestId("curriculum-tree")).toContainText(className);
  await expect(page.getByTestId("curriculum-tree")).toContainText(subjectName);
  await expect(page.getByTestId("curriculum-tree")).toContainText("1 chapter");
});

test("admin sees error feedback when creating a duplicate board", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");

  const suffix = Date.now().toString();
  const boardName = `Duplicate Board ${suffix}`;

  await page.getByTestId("curriculum-board-name-input").fill(boardName);
  await page.getByTestId("curriculum-board-submit").click();
  await expect(page.getByTestId("curriculum-tree")).toContainText(boardName);

  await page.getByTestId("curriculum-board-name-input").fill(boardName);
  await page.getByTestId("curriculum-board-submit").click();

  await expect(page.getByText("Could not create board")).toBeVisible();

  const response = await page.request.get("http://localhost:3001/api/admin/content/curriculum");
  expect(response.status()).toBe(200);
  const payload = (await response.json()) as {
    boards: Array<{ name: string }>;
  };

  const createdBoards = payload.boards.filter((entry) => entry.name === boardName);
  expect(createdBoards.length).toBe(1);
});
