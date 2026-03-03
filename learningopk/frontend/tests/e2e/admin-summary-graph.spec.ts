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

test("summary graph filters nodes and opens chapter from graph controls", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");
  await page.getByTestId("curriculum-tab-chapter").click();

  const suffix = Date.now().toString();
  const boardName = `Graph Board ${suffix}`;
  const className = `9th ${suffix}`;
  const subjectName = `Graph Physics ${suffix}`;
  const sourceChapterTitle = `Graph Source ${suffix}`;
  const targetChapterTitle = `Graph Target ${suffix}`;

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
  await page.getByTestId("curriculum-chapter-summary-input").fill("Graph source summary.");
  await page.getByTestId("curriculum-chapter-submit").click();

  await page.getByTestId("curriculum-chapter-subject-select").selectOption({ label: subjectLabel });
  await page.getByTestId("curriculum-chapter-number-input").fill("2");
  await page.getByTestId("curriculum-chapter-title-input").fill(targetChapterTitle);
  await page
    .getByTestId("curriculum-chapter-summary-input")
    .fill(`Graph target summary ${suffix} for graph open verification.`);
  await page.getByTestId("curriculum-chapter-submit").click();

  const sourceLabel = `${subjectLabel} / Chapter 1: ${sourceChapterTitle}`;
  await page.getByTestId("curriculum-summary-editor-chapter-select").selectOption({ label: sourceLabel });
  await setSummaryCodeMirrorContent(page, `See [[${targetChapterTitle}]] from source.`);
  await page.getByTestId("curriculum-summary-editor-save-button").click();
  await expect(page.getByText("Chapter summary updated")).toBeVisible();

  const graphPanel = page.getByTestId("curriculum-summary-graph-panel");
  await expect(graphPanel).toBeVisible();
  await page.getByTestId("curriculum-summary-graph-search").fill(targetChapterTitle);
  await expect(graphPanel).toContainText(targetChapterTitle);

  await page.getByRole("button", { name: targetChapterTitle }).click();
  await expect(page.getByTestId("curriculum-summary-editor-preview")).toContainText(
    `Graph target summary ${suffix} for graph open verification.`
  );
});
