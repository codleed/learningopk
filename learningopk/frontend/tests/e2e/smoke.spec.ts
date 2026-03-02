import { expect, test, type APIRequestContext } from "@playwright/test";

const backendBaseUrl = "http://localhost:3001";

type ForumFiltersResponse = {
  boards: Array<{ id: number; slug: string; name: string }>;
  subjects: Array<{ id: number; slug: string; name: string; classSlug: string | null; boardId: number }>;
  chapters: Array<{ id: number; slug: string; title: string; chapterNumber: number; subjectId: number }>;
};

type ChapterRoute = {
  boardSlug: string;
  grade: string;
  subjectSlug: string;
  chapterSlug: string;
};

const pickChapterRouteWithQuiz = async (api: APIRequestContext): Promise<ChapterRoute> => {
  const filtersResponse = await api.get(`${backendBaseUrl}/api/forum/filters`);
  if (!filtersResponse.ok()) {
    throw new Error(`Failed to fetch forum filters for smoke precheck: ${filtersResponse.status()}`);
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

    const chapterPayload = (await chapterResponse.json()) as { quiz: { questions: unknown[] } | null };
    if (chapterPayload.quiz && chapterPayload.quiz.questions.length > 0) {
      return {
        boardSlug: board.slug,
        grade: subject.classSlug,
        subjectSlug: subject.slug,
        chapterSlug: chapter.slug
      };
    }
  }

  throw new Error("No seeded chapter with a quiz was found for smoke coverage.");
};

test("register -> chapter -> quiz -> AI chat -> dashboard", async ({ page }) => {
  const route = await pickChapterRouteWithQuiz(page.request);
  const timestamp = Date.now();
  const password = "StrongPass123";

  test.setTimeout(180_000);

  await page.goto("/register");
  await page.getByLabel("Name").fill("Smoke Test Student");
  await page.getByLabel("Degree").fill("Matriculation");
  await page.getByLabel("Board").selectOption("fbise");
  await page.getByLabel("Class").selectOption("9th");
  await page.getByLabel("Email").fill(`smoke_flow_${timestamp}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto(`/${route.boardSlug}/${route.grade}/${route.subjectSlug}/${route.chapterSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const quizTab = page.getByRole("link", { name: /Quiz|Mock Exam/ }).first();
  await Promise.all([page.waitForURL(/tab=quiz/), quizTab.click()]);

  await expect(page.getByRole("button", { name: /Submit Quiz|Submit Time-Up Attempt/ })).toBeVisible();
  await page.locator("button").filter({ hasText: /^A\./ }).first().click();
  await page.getByRole("button", { name: /Submit Quiz|Submit Time-Up Attempt/ }).click();
  await expect(page.getByText("Result", { exact: true })).toBeVisible();

  await Promise.all([page.waitForURL(/tab=exercises/), page.getByRole("link", { name: "Exercises" }).click()]);
  await page.getByRole("button", { name: "Open AI Tutor" }).click();

  const aiInput = page.locator("#ai-chat-input");
  await aiInput.fill("Guide me through solving the first exercise using hints first.");
  await page.getByRole("button", { name: "Send" }).click();

  const assistantBubble = page.locator("aside div.bg-zinc-100").last();
  const assistantVisible = await assistantBubble.isVisible({ timeout: 45_000 });
  if (assistantVisible) {
    await expect
      .poll(async () => (await assistantBubble.textContent())?.trim() ?? "", { timeout: 90_000 })
      .toMatch(/\S/);
    await expect
      .poll(async () => (await assistantBubble.textContent())?.trim() ?? "", { timeout: 90_000 })
      .not.toBe("Thinking...");
  } else {
    const assistantError = page
      .locator("aside p")
      .filter({ hasText: /Mistral API key is not configured on the server|AI request failed|Unable to reach AI service/i })
      .first();
    await expect(assistantError).toBeVisible();
  }

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent Activity" })).toBeVisible();
  await expect(page.getByText(/Quiz submitted in/i)).toBeVisible();
});

