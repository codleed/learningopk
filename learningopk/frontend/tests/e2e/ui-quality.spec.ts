import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const backendBaseUrl = "http://localhost:3001";

type ForumFiltersResponse = {
  boards: Array<{ id: number; slug: string; name: string }>;
  subjects: Array<{
    id: number;
    slug: string;
    name: string;
    classSlug: string | null;
    boardId: number;
  }>;
  chapters: Array<{
    id: number;
    slug: string;
    title: string;
    chapterNumber: number;
    subjectId: number;
  }>;
};

type ChapterRoute = {
  boardSlug: string;
  grade: string;
  subjectSlug: string;
  chapterSlug: string;
};

const assertNoHorizontalOverflow = async (page: Page) => {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(hasOverflow).toBeFalsy();
};

const pickChapterRouteWithQuiz = async (api: APIRequestContext): Promise<ChapterRoute> => {
  const filtersResponse = await api.get(`${backendBaseUrl}/api/forum/filters`);
  if (!filtersResponse.ok()) {
    throw new Error(
      `Failed to fetch forum filters for UI quality precheck: ${filtersResponse.status()}`
    );
  }

  const filters = (await filtersResponse.json()) as ForumFiltersResponse;

  for (const chapter of filters.chapters) {
    const subject = filters.subjects.find((candidate) => candidate.id === chapter.subjectId);
    if (!subject) {
      continue;
    }

    const board = filters.boards.find((candidate) => candidate.id === subject.boardId);
    if (!board) {
      continue;
    }
    if (!subject.classSlug) {
      continue;
    }

    const chapterResponse = await api.get(
      `${backendBaseUrl}/api/learn/${board.slug}/${subject.classSlug}/${subject.slug}/${chapter.slug}`
    );
    if (!chapterResponse.ok()) {
      continue;
    }

    const chapterPayload = (await chapterResponse.json()) as {
      quiz: { questions: unknown[] } | null;
    };
    if (chapterPayload.quiz && chapterPayload.quiz.questions.length > 0) {
      return {
        boardSlug: board.slug,
        grade: subject.classSlug,
        subjectSlug: subject.slug,
        chapterSlug: chapter.slug,
      };
    }
  }

  throw new Error("No seeded chapter with a quiz was found for UI quality coverage.");
};

test("critical UI routes render with expected structure", async ({ page }) => {
  const route = await pickChapterRouteWithQuiz(page.request);
  const timestamp = Date.now();
  const password = "StrongPass123";
  const email = `ui_quality_${timestamp}@example.com`;

  test.setTimeout(180_000);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create your student account" })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.goto("/register");
  await page.getByLabel("Name").fill("UI Quality Student");
  await page.getByLabel("Degree").fill("Matriculation");
  await page.getByLabel("Board").selectOption("fbise");
  await page.getByLabel("Class").selectOption("9th");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto(`/${route.boardSlug}/${route.grade}/${route.subjectSlug}/${route.chapterSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Summary" })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.goto("/forum");
  await expect(page.getByRole("heading", { name: "Forum" })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await expect(page.getByLabel("Title")).toHaveCount(0);
  await expect(page.getByLabel("Body (markdown supported)")).toHaveCount(0);
  await page.getByRole("button", { name: "Create thread" }).click();
  await page.getByLabel("Title").fill(`UI quality thread ${timestamp}`);
  await page
    .getByLabel("Body (markdown supported)")
    .fill("Testing forum detail route render for quality checks.");
  await page.getByRole("button", { name: "Post thread" }).click();
  await expect(page).toHaveURL(/\/forum\/[0-9a-fA-F-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test.describe("mobile layout smoke", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("root, auth, and forum render without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.goto("/forum");
    await expect(page.getByRole("heading", { name: "Forum" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
