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
      `Failed to fetch forum filters for phase3 route precheck: ${filtersResponse.status()}`
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

  throw new Error("No seeded chapter with a quiz was found for phase3 route verification.");
};

const registerStudent = async (page: Page, name: string) => {
  const timestamp = Date.now();
  const password = "StrongPass123";

  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Degree").fill("Matriculation");
  await page.getByLabel("Board").selectOption("fbise");
  await page.getByLabel("Class").selectOption("9th");
  await page
    .getByLabel("Email")
    .fill(`phase3_${name.toLowerCase().replace(/\s+/g, "_")}_${timestamp}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test("password reset feature removed from UI", async ({ page }) => {
  // Login page should NOT show "Forgot password?" link
  await page.goto("/login");
  const forgotLink = page.getByText("Forgot password?");
  await expect(forgotLink).not.toBeVisible();

  // Reset password and forgot password routes should 404 or redirect to error
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/(404|not-found|error)$/);

  await page.goto("/forgot-password");
  await expect(page).toHaveURL(/\/(404|not-found|error)$/);
});

test("unified dashboard/learn routes preserve links, tabs, and actions", async ({ page }) => {
  const route = await pickChapterRouteWithQuiz(page.request);

  await registerStudent(page, "Phase 3 Route Student");

  await page.goto(`/dashboard/${route.subjectSlug}`);
  await expect(page.getByRole("heading", { level: 1, name: /Progress$/ })).toBeVisible();
  await expect(page.getByLabel("Primary navigation")).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto(`/${route.boardSlug}/${route.grade}/${route.subjectSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open chapter" }).first()).toBeVisible();
  await expect(page.getByLabel("Primary navigation")).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.goto(
    `/${route.boardSlug}/${route.grade}/${route.subjectSlug}/${route.chapterSlug}?tab=summary`
  );
  await expect(page.getByRole("link", { name: "Summary" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Exercises" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Flashcards" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quiz|Mock Exam/ })).toBeVisible();
  await expect(page.getByLabel("Primary navigation")).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.goto(
    `/${route.boardSlug}/${route.grade}/${route.subjectSlug}/${route.chapterSlug}?tab=exercises`
  );
  await expect(page.getByRole("button", { name: "Open AI Tutor" })).toBeVisible();
  await page.getByRole("button", { name: "Open AI Tutor" }).click();
  await assertNoHorizontalOverflow(page);

  await page.goto(
    `/${route.boardSlug}/${route.grade}/${route.subjectSlug}/${route.chapterSlug}?tab=flashcards`
  );
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.goto(
    `/${route.boardSlug}/${route.grade}/${route.subjectSlug}/${route.chapterSlug}?tab=quiz`
  );
  await expect(
    page.getByRole("button", { name: /Submit Quiz|Submit Time-Up Attempt/ })
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test.describe("mobile unified route overflow checks", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("subject progress and learn routes avoid horizontal overflow on mobile", async ({
    page,
  }) => {
    const route = await pickChapterRouteWithQuiz(page.request);

    await registerStudent(page, "Phase 3 Mobile Student");

    await page.goto(`/dashboard/${route.subjectSlug}`);
    await expect(page.getByRole("heading", { level: 1, name: /Progress$/ })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.goto(`/${route.boardSlug}/${route.grade}/${route.subjectSlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.goto(
      `/${route.boardSlug}/${route.grade}/${route.subjectSlug}/${route.chapterSlug}?tab=summary`
    );
    await expect(page.getByRole("link", { name: "Summary" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
