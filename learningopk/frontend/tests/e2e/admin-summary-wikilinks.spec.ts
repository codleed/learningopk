import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole("button", { name: "Sign in" }).click()]);
};

const setSummaryCodeMirrorContent = async (page: Page, content: string) => {
  const editorContent = page.locator("[data-testid='curriculum-summary-editor-cm6'] .cm-content");
  await expect(editorContent).toBeVisible();
  await editorContent.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(content);
};

test("summary editor shows wiki suggestions and backlinks panel", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");
  await page.getByTestId("curriculum-tab-chapter").click();

  const suffix = Date.now().toString();
  const boardName = `Wiki Board ${suffix}`;
  const className = `9th ${suffix}`;
  const subjectName = `Wiki Physics ${suffix}`;
  const sourceChapterTitle = `Source ${suffix}`;
  const targetChapterTitle = `Target ${suffix}`;

  await page.getByTestId("curriculum-tab-board").click();
  await page.getByTestId("curriculum-board-name-input").fill(boardName);
  await page.getByTestId("curriculum-board-submit").click();

  await page.getByTestId("curriculum-tab-class").click();
  await page.getByTestId("curriculum-class-board-select").selectOption({ label: boardName });
  await page.getByTestId("curriculum-class-name-input").fill(className);
  await page.getByTestId("curriculum-class-submit").click();

  await page.getByTestId("curriculum-tab-subject").click();
  await page.getByTestId("curriculum-subject-class-select").selectOption({ label: `${boardName} / ${className}` });
  await page.getByTestId("curriculum-subject-name-input").fill(subjectName);
  await page.getByTestId("curriculum-subject-submit").click();

  await page.getByTestId("curriculum-tab-chapter").click();
  const subjectLabel = `${boardName} / ${className} / ${subjectName}`;
  await page.getByTestId("curriculum-chapter-subject-select").selectOption({ label: subjectLabel });
  await page.getByTestId("curriculum-chapter-number-input").fill("1");
  await page.getByTestId("curriculum-chapter-title-input").fill(sourceChapterTitle);
  await page.getByTestId("curriculum-chapter-summary-input").fill("Source chapter summary.");
  await page.getByTestId("curriculum-chapter-submit").click();

  await page.getByTestId("curriculum-chapter-subject-select").selectOption({ label: subjectLabel });
  await page.getByTestId("curriculum-chapter-number-input").fill("2");
  await page.getByTestId("curriculum-chapter-title-input").fill(targetChapterTitle);
  await page.getByTestId("curriculum-chapter-summary-input").fill("Target chapter summary.");
  await page.getByTestId("curriculum-chapter-submit").click();

  const sourceLabel = `${subjectLabel} / Chapter 1: ${sourceChapterTitle}`;
  await page.getByTestId("curriculum-summary-editor-chapter-select").selectOption({ label: sourceLabel });

  const editorContent = page.locator("[data-testid='curriculum-summary-editor-cm6'] .cm-content");
  await editorContent.click();
  await page.keyboard.insertText("[[Tar");
  await expect(page.getByTestId("curriculum-summary-editor-link-suggestions")).toContainText(targetChapterTitle);

  await setSummaryCodeMirrorContent(page, `See [[${targetChapterTitle}]] and [[Missing Concept ${suffix}]].`);
  await page.getByTestId("curriculum-summary-editor-save-button").click();
  await expect(page.getByText("Chapter summary updated")).toBeVisible();

  const linksPanel = page.getByTestId("curriculum-summary-editor-links-panel");
  await expect(linksPanel).toContainText(targetChapterTitle);
  await expect(linksPanel).toContainText(`Missing Concept ${suffix}`);
  await expect(linksPanel).toContainText("Backlinks");
});
