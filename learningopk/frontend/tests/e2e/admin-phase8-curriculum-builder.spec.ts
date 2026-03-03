import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole("button", { name: "Sign in" }).click()]);
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

test("admin content renders curriculum builder controls", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");

  await expect(page.getByRole("heading", { name: "Curriculum Builder" })).toBeVisible();
  await expect(page.getByTestId("curriculum-form-tabs")).toBeVisible();
  await expect(page.getByTestId("curriculum-tab-board")).toBeVisible();
  await expect(page.getByTestId("curriculum-tab-class")).toBeVisible();
  await expect(page.getByTestId("curriculum-tab-subject")).toBeVisible();
  await expect(page.getByTestId("curriculum-tab-chapter")).toBeVisible();
  await expect(page.getByTestId("curriculum-tab-exercise")).toBeVisible();
  await expect(page.getByTestId("curriculum-board-form")).toBeVisible();
  await expect(page.getByTestId("curriculum-class-form")).toHaveCount(0);
  await expect(page.getByTestId("curriculum-subject-form")).toHaveCount(0);
  await expect(page.getByTestId("curriculum-chapter-form")).toHaveCount(0);

  await page.getByTestId("curriculum-tab-chapter").click();
  await expect(page.getByTestId("curriculum-chapter-form")).toBeVisible();
  await expect(page.locator("textarea[data-testid='curriculum-chapter-summary-input']")).toBeVisible();
  await expect(page.getByText("Supports Markdown, images, and math notation.")).toBeVisible();
  await expect(page.getByTestId("curriculum-tree")).toBeVisible();
});

test("chapter summary preview renders markdown, images, and math", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");
  await page.getByTestId("curriculum-tab-chapter").click();

  await page.getByTestId("curriculum-chapter-summary-input").fill("$$x = 8 \\quad \\text{or} \\quad x = 3$$");

  await expect(page.locator("[data-testid='curriculum-chapter-summary-preview'] .katex-display")).toHaveCount(1);
  await expect(page.locator("[data-testid='curriculum-chapter-summary-preview']")).not.toContainText("$$x = 8");
});

test("student chapter summary screen renders markdown content", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");

  const suffix = Date.now().toString();
  const boardName = `MD Board ${suffix}`;
  const className = `9th ${suffix}`;
  const subjectName = `MD Physics ${suffix}`;
  const chapterTitle = `Forces ${suffix}`;

  await page.getByTestId("curriculum-board-name-input").fill(boardName);
  await page.getByTestId("curriculum-board-submit").click();

  await page.getByTestId("curriculum-tab-class").click();
  await page.getByTestId("curriculum-class-board-select").selectOption({ label: boardName });
  await page.getByTestId("curriculum-class-name-input").fill(className);
  await page.getByTestId("curriculum-class-submit").click();

  await page.getByTestId("curriculum-tab-subject").click();
  await page
    .getByTestId("curriculum-subject-class-select")
    .selectOption({ label: `${boardName} / ${className}` });
  await page.getByTestId("curriculum-subject-name-input").fill(subjectName);
  await page.getByTestId("curriculum-subject-submit").click();

  await page.getByTestId("curriculum-tab-chapter").click();
  await page
    .getByTestId("curriculum-chapter-subject-select")
    .selectOption({ label: `${boardName} / ${className} / ${subjectName}` });
  await page.getByTestId("curriculum-chapter-number-input").fill("1");
  await page.getByTestId("curriculum-chapter-title-input").fill(chapterTitle);
  await page
    .getByTestId("curriculum-chapter-summary-input")
    .fill(
      "![PreviewDiagramMd](https://example.com/momentum.png)\n\n$$x = 8 \\quad \\text{or} \\quad x = 3$$"
    );
  await page.getByTestId("curriculum-chapter-submit").click();

  const curriculumResponse = await page.request.get("http://localhost:3001/api/admin/content/curriculum");
  expect(curriculumResponse.status()).toBe(200);
  const curriculumPayload = (await curriculumResponse.json()) as {
    boards: Array<{
      id: number;
      name: string;
      slug: string;
      classes: Array<{
        id: number;
        name: string;
        slug: string;
        subjects: Array<{
          id: number;
          name: string;
          slug: string;
          chapters: Array<{ id: number; title: string; slug: string }>;
        }>;
      }>;
    }>;
  };

  const board = curriculumPayload.boards.find((entry) => entry.name === boardName);
  expect(board).toBeTruthy();
  const boardClass = board?.classes.find((entry) => entry.name === className);
  expect(boardClass).toBeTruthy();
  const subject = boardClass?.subjects.find((entry) => entry.name === subjectName);
  expect(subject).toBeTruthy();
  const chapter = subject?.chapters.find((entry) => entry.title === chapterTitle);
  expect(chapter).toBeTruthy();

  const publishResponse = await page.request.post(`http://localhost:3001/api/admin/content/chapters/${chapter?.id}/publish`, {
    data: { isPublished: true }
  });
  expect(publishResponse.status()).toBe(200);

  await page.goto(
    `/${toSlug(boardName)}/${toSlug(className)}/${toSlug(subjectName)}/${toSlug(chapterTitle)}?tab=summary`
  );

  await expect(page.locator("[data-testid='chapter-summary-markdown'] img[alt='PreviewDiagramMd']")).toHaveCount(1);
  await expect(page.locator("[data-testid='chapter-summary-markdown'] .katex-display")).toHaveCount(1);
  await expect(page.locator("[data-testid='chapter-summary-markdown']")).not.toContainText("$$x = 8");
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

  await page.getByTestId("curriculum-tab-class").click();
  await page.getByTestId("curriculum-class-board-select").selectOption({ label: boardName });
  await page.getByTestId("curriculum-class-name-input").fill(className);
  await page.getByTestId("curriculum-class-submit").click();

  await page.getByTestId("curriculum-tab-subject").click();
  await page
    .getByTestId("curriculum-subject-class-select")
    .selectOption({ label: `${boardName} / ${className}` });
  await page.getByTestId("curriculum-subject-name-input").fill(subjectName);
  await page.getByTestId("curriculum-subject-submit").click();

  await page.getByTestId("curriculum-tab-chapter").click();
  await page
    .getByTestId("curriculum-chapter-subject-select")
    .selectOption({ label: `${boardName} / ${className} / ${subjectName}` });
  await page.getByTestId("curriculum-chapter-number-input").fill("1");
  await page.getByTestId("curriculum-chapter-title-input").fill(chapterTitle);
  await page.getByTestId("curriculum-chapter-summary-input").fill("Chapter summary for e2e coverage.");
  await page.getByTestId("curriculum-chapter-submit").click();

  await expect(page.getByTestId("curriculum-tree")).toContainText(boardName);
  await expect(page.getByTestId("curriculum-tree")).not.toContainText(className);
  await page.getByLabel(`Toggle ${boardName}`).click();
  await expect(page.getByTestId("curriculum-tree")).toContainText(className);
  await expect(page.getByTestId("curriculum-tree")).toContainText(subjectName);
  await expect(page.getByTestId("curriculum-tree")).toContainText("1 chapter");
});

test("admin can add exercise from exercise tab with physics numerical option", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");

  const suffix = Date.now().toString();
  const boardName = `Exercise Board ${suffix}`;
  const className = `9th ${suffix}`;
  const subjectName = `Physics ${suffix}`;
  const chapterTitle = `Work and Energy ${suffix}`;

  await page.getByTestId("curriculum-board-name-input").fill(boardName);
  await page.getByTestId("curriculum-board-submit").click();

  await page.getByTestId("curriculum-tab-class").click();
  await page.getByTestId("curriculum-class-board-select").selectOption({ label: boardName });
  await page.getByTestId("curriculum-class-name-input").fill(className);
  await page.getByTestId("curriculum-class-submit").click();

  await page.getByTestId("curriculum-tab-subject").click();
  await page
    .getByTestId("curriculum-subject-class-select")
    .selectOption({ label: `${boardName} / ${className}` });
  await page.getByTestId("curriculum-subject-name-input").fill(subjectName);
  await page.getByTestId("curriculum-subject-submit").click();

  await page.getByTestId("curriculum-tab-chapter").click();
  await page
    .getByTestId("curriculum-chapter-subject-select")
    .selectOption({ label: `${boardName} / ${className} / ${subjectName}` });
  await page.getByTestId("curriculum-chapter-number-input").fill("1");
  await page.getByTestId("curriculum-chapter-title-input").fill(chapterTitle);
  await page.getByTestId("curriculum-chapter-summary-input").fill("Chapter summary.");
  await page.getByTestId("curriculum-chapter-submit").click();

  await page.getByTestId("curriculum-tab-exercise").click();
  await page
    .getByTestId("curriculum-exercise-chapter-select")
    .selectOption({ label: `${boardName} / ${className} / ${subjectName} / Chapter 1: ${chapterTitle}` });

  await expect(page.getByTestId("curriculum-exercise-type-select")).toContainText("Comprehension Questions Short Questions");
  await expect(page.getByTestId("curriculum-exercise-type-select")).toContainText("MCQs");
  await expect(page.getByTestId("curriculum-exercise-type-select")).toContainText("Comprehension Questions Long Questions");
  await expect(page.getByTestId("curriculum-exercise-type-select")).toContainText("Numerical Problems");

  await page.getByTestId("curriculum-exercise-type-select").selectOption("numerical");
  await page.getByTestId("curriculum-exercise-number-input").fill("Q1");
  await page
    .getByTestId("curriculum-exercise-question-input")
    .fill("A body has mass 2kg and acceleration 3m/s^2. Find force.");
  await page.getByTestId("curriculum-exercise-solution-input").fill("Using $$F=ma$$, force is 6N.");
  await page.getByTestId("curriculum-exercise-submit").click();

  const curriculumResponse = await page.request.get("http://localhost:3001/api/admin/content/curriculum");
  expect(curriculumResponse.status()).toBe(200);
  const curriculumPayload = (await curriculumResponse.json()) as {
    boards: Array<{
      name: string;
      classes: Array<{
        name: string;
        subjects: Array<{
          name: string;
          chapters: Array<{ id: number; title: string }>;
        }>;
      }>;
    }>;
  };
  const chapterId = curriculumPayload.boards
    .find((entry) => entry.name === boardName)
    ?.classes.find((entry) => entry.name === className)
    ?.subjects.find((entry) => entry.name === subjectName)
    ?.chapters.find((entry) => entry.title === chapterTitle)?.id;
  expect(typeof chapterId).toBe("number");

  const publishResponse = await page.request.post(`http://localhost:3001/api/admin/content/chapters/${chapterId}/publish`, {
    data: { isPublished: true }
  });
  expect(publishResponse.status()).toBe(200);

  await page.goto(`/${toSlug(boardName)}/${toSlug(className)}/${toSlug(subjectName)}/${toSlug(chapterTitle)}?tab=exercises`);
  await expect(page.getByText("A body has mass 2kg and acceleration 3m/s^2. Find force.")).toBeVisible();
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
