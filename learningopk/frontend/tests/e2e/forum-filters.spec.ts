import { expect, test, type Page } from "@playwright/test";

/**
 * Forum filter-state preservation E2E tests.
 *
 * These tests verify that the ForumFilterBar preserves all active URL
 * parameters when individual controls change — search, solved toggles,
 * and advanced filters should never reset one another.
 */

const FORUM_URL = "/forum";

/* ── Helpers ── */

/** Navigate to the forum with seed params so we have a known baseline. */
const gotoForumWith = async (
  page: Page,
  params: Record<string, string>
): Promise<void> => {
  const search = new URLSearchParams(params).toString();
  const url = search ? `${FORUM_URL}?${search}` : FORUM_URL;
  await page.goto(url);
  await page.waitForLoadState("domcontentloaded");
};

/** Return the current search-params object for the page URL. */
const currentParams = (page: Page): URLSearchParams =>
  new URL(page.url()).searchParams;

/* ── Tests ── */

test.describe("forum filter state preservation", () => {
  test("search preserves active solved filter", async ({ page }) => {
    // Start with solved filter active
    await gotoForumWith(page, { solved: "solved" });

    // Type a search query and submit
    const searchInput = page.getByPlaceholder("Search threads...");
    await searchInput.fill("algebra");
    await searchInput.press("Enter");

    // Wait for navigation
    await page.waitForURL(/q=algebra/);

    // Verify both params are preserved
    const params = currentParams(page);
    expect(params.get("q")).toBe("algebra");
    expect(params.get("solved")).toBe("solved");
  });

  test("search preserves board and grade filters", async ({ page }) => {
    // Start with board + grade active
    await gotoForumWith(page, { board: "fbise", grade: "9th" });

    // Search
    const searchInput = page.getByPlaceholder("Search threads...");
    await searchInput.fill("physics");
    await searchInput.press("Enter");

    await page.waitForURL(/q=physics/);

    const params = currentParams(page);
    expect(params.get("q")).toBe("physics");
    expect(params.get("board")).toBe("fbise");
    expect(params.get("grade")).toBe("9th");
  });

  test("search preserves subjectId and chapterId filters", async ({ page }) => {
    // Start with subjectId + chapterId active
    await gotoForumWith(page, { subjectId: "1", chapterId: "3" });

    const searchInput = page.getByPlaceholder("Search threads...");
    await searchInput.fill("equations");
    await searchInput.press("Enter");

    await page.waitForURL(/q=equations/);

    const params = currentParams(page);
    expect(params.get("q")).toBe("equations");
    expect(params.get("subjectId")).toBe("1");
    expect(params.get("chapterId")).toBe("3");
  });

  test("solved toggle preserves active search query", async ({ page }) => {
    // Start with a search query
    await gotoForumWith(page, { q: "trigonometry" });

    // Click the "Solved" quick filter pill
    const solvedLink = page.getByRole("link", { name: "Solved", exact: true });
    await solvedLink.click();

    await page.waitForURL(/solved=solved/);

    const params = currentParams(page);
    expect(params.get("q")).toBe("trigonometry");
    expect(params.get("solved")).toBe("solved");
  });

  test("solved toggle preserves board and grade", async ({ page }) => {
    // Start with board + grade + search
    await gotoForumWith(page, { board: "fbise", grade: "9th", q: "newton" });

    // Click "Unsolved"
    const unsolvedLink = page.getByRole("link", { name: "Unsolved", exact: true });
    await unsolvedLink.click();

    await page.waitForURL(/solved=unsolved/);

    const params = currentParams(page);
    expect(params.get("q")).toBe("newton");
    expect(params.get("board")).toBe("fbise");
    expect(params.get("grade")).toBe("9th");
    expect(params.get("solved")).toBe("unsolved");
  });

  test("switching from solved to all removes solved param but keeps others", async ({ page }) => {
    // Start with everything active
    await gotoForumWith(page, {
      q: "waves",
      board: "fbise",
      grade: "9th",
      solved: "solved",
    });

    // Click "All" quick filter
    const allLink = page.getByRole("link", { name: "All", exact: true });
    await allLink.click();

    // "all" is the default, so it should be absent from URL
    await page.waitForURL((url) => !url.searchParams.has("solved"));

    const params = currentParams(page);
    expect(params.get("q")).toBe("waves");
    expect(params.get("board")).toBe("fbise");
    expect(params.get("grade")).toBe("9th");
    expect(params.has("solved")).toBe(false);
  });

  test("combined interaction: search -> solved -> search again keeps solved", async ({ page }) => {
    // 1. Start fresh
    await gotoForumWith(page, {});

    // 2. Search for something
    const searchInput = page.getByPlaceholder("Search threads...");
    await searchInput.fill("integration");
    await searchInput.press("Enter");
    await page.waitForURL(/q=integration/);

    // 3. Toggle solved
    const solvedLink = page.getByRole("link", { name: "Solved", exact: true });
    await solvedLink.click();
    await page.waitForURL(/solved=solved/);

    // 4. Verify both are still present
    let params = currentParams(page);
    expect(params.get("q")).toBe("integration");
    expect(params.get("solved")).toBe("solved");

    // 5. Search again with a different term
    const searchInput2 = page.getByPlaceholder("Search threads...");
    await searchInput2.fill("differentiation");
    await searchInput2.press("Enter");
    await page.waitForURL(/q=differentiation/);

    // 6. Solved should still be preserved
    params = currentParams(page);
    expect(params.get("q")).toBe("differentiation");
    expect(params.get("solved")).toBe("solved");
  });

  test("search preserves all filters simultaneously", async ({ page }) => {
    // Start with every filter active
    await gotoForumWith(page, {
      board: "fbise",
      grade: "9th",
      subjectId: "1",
      chapterId: "3",
      solved: "unsolved",
    });

    const searchInput = page.getByPlaceholder("Search threads...");
    await searchInput.fill("full filter test");
    await searchInput.press("Enter");

    await page.waitForURL(/q=full/);

    const params = currentParams(page);
    expect(params.get("q")).toBe("full filter test");
    expect(params.get("board")).toBe("fbise");
    expect(params.get("grade")).toBe("9th");
    expect(params.get("subjectId")).toBe("1");
    expect(params.get("chapterId")).toBe("3");
    expect(params.get("solved")).toBe("unsolved");
  });

  test("new post button preserves current filter state", async ({ page }) => {
    // Register a user so the "New Post" button appears
    const timestamp = Date.now();
    await page.goto("/register");
    await page.getByLabel("Name").fill("Forum Filters Student");
    await page.getByLabel("Degree").fill("Matriculation");
    await page.getByLabel("Board").selectOption("fbise");
    await page.getByLabel("Class").selectOption("9th");
    await page.getByLabel("Email").fill(`filter_test_${timestamp}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("StrongPass123");
    await page.getByLabel("Confirm Password", { exact: true }).fill("StrongPass123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Go to forum with filters
    await gotoForumWith(page, { q: "compose-test", solved: "solved", board: "fbise" });

    // The "New Post" button should include compose=1 plus existing params
    const newPostLink = page.getByRole("link", { name: /New Post/ });
    if (await newPostLink.isVisible({ timeout: 5_000 })) {
      const href = await newPostLink.getAttribute("href");
      expect(href).toBeTruthy();
      const composeUrl = new URL(href!, "http://localhost:3000");
      expect(composeUrl.searchParams.get("compose")).toBe("1");
      expect(composeUrl.searchParams.get("q")).toBe("compose-test");
      expect(composeUrl.searchParams.get("solved")).toBe("solved");
      expect(composeUrl.searchParams.get("board")).toBe("fbise");
    }
  });
});
