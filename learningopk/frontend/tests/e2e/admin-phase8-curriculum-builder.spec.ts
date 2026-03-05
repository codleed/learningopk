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

const setSummaryCodeMirrorContent = async (page: Page, content: string) => {
  const editorContent = page.locator("[data-testid='curriculum-summary-editor-cm6'] .cm-content");
  await expect(editorContent).toBeVisible();
  await editorContent.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(content);
};

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
  await expect(page.getByTestId("curriculum-chapter-mode-tabs")).toBeVisible();
  await expect(page.getByTestId("curriculum-chapter-mode-add")).toBeVisible();
  await expect(page.getByTestId("curriculum-chapter-mode-edit")).toBeVisible();
  await expect(page.getByTestId("curriculum-chapter-form")).toBeVisible();
  await expect(page.locator("textarea[data-testid='curriculum-chapter-summary-input']")).toBeVisible();
  await expect(page.getByText("Supports Markdown, images, and math notation.")).toBeVisible();
  await expect(page.getByTestId("curriculum-summary-editor-chapter-select")).toHaveCount(0);
  await expect(page.getByTestId("curriculum-chapter-summary-preview-toggle")).toBeVisible();
  await expect(page.getByTestId("curriculum-chapter-summary-preview")).toHaveCount(0);
  await page.getByTestId("curriculum-chapter-mode-edit").click();
  await expect(page.getByTestId("curriculum-chapter-form")).toHaveCount(0);
  await expect(page.getByTestId("curriculum-summary-editor-chapter-select")).toBeVisible();
  await expect(page.getByTestId("curriculum-summary-editor-cm6")).toBeVisible();
  await expect(page.getByTestId("curriculum-summary-editor-upload-button")).toBeVisible();
  await expect(page.getByTestId("curriculum-summary-editor-save-button")).toBeVisible();
  await expect(page.getByTestId("curriculum-summary-editor-preview-toggle")).toBeVisible();
  await expect(page.getByTestId("curriculum-summary-editor-preview")).toHaveCount(0);
  await expect(page.getByTestId("curriculum-tree")).toBeVisible();
});

test("chapter summary preview renders markdown, images, and math", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");
  await page.getByTestId("curriculum-tab-chapter").click();

  await page.getByTestId("curriculum-chapter-summary-input").fill("$$x = 8 \\quad \\text{or} \\quad x = 3$$");
  await page.getByTestId("curriculum-chapter-summary-preview-toggle").click();

  await expect(page.locator("[data-testid='curriculum-chapter-summary-preview'] .katex-display")).toHaveCount(1);
  await expect(page.locator("[data-testid='curriculum-chapter-summary-preview']")).not.toContainText("$$x = 8");
});

test("chapter summary preview preserves heading hierarchy for h1 h2 h3", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");
  await page.getByTestId("curriculum-tab-chapter").click();

  await page.getByTestId("curriculum-chapter-summary-input").fill("# Heading 1\n## Heading 2\n### Heading 3");
  await page.getByTestId("curriculum-chapter-summary-preview-toggle").click();

  const preview = page.locator("[data-testid='curriculum-chapter-summary-preview']");
  const h1 = preview.locator("h1", { hasText: "Heading 1" });
  const h2 = preview.locator("h2", { hasText: "Heading 2" });
  const h3 = preview.locator("h3", { hasText: "Heading 3" });
  await expect(h1).toBeVisible();
  await expect(h2).toBeVisible();
  await expect(h3).toBeVisible();

  const sizes = await preview.evaluate(() => {
    const h1El = Array.from(document.querySelectorAll("[data-testid='curriculum-chapter-summary-preview'] h1")).find((node) =>
      node.textContent?.includes("Heading 1")
    ) as HTMLElement | undefined;
    const h2El = Array.from(document.querySelectorAll("[data-testid='curriculum-chapter-summary-preview'] h2")).find((node) =>
      node.textContent?.includes("Heading 2")
    ) as HTMLElement | undefined;
    const h3El = Array.from(document.querySelectorAll("[data-testid='curriculum-chapter-summary-preview'] h3")).find((node) =>
      node.textContent?.includes("Heading 3")
    ) as HTMLElement | undefined;

    const h1Size = h1El ? Number.parseFloat(window.getComputedStyle(h1El).fontSize) : 0;
    const h2Size = h2El ? Number.parseFloat(window.getComputedStyle(h2El).fontSize) : 0;
    const h3Size = h3El ? Number.parseFloat(window.getComputedStyle(h3El).fontSize) : 0;

    return { h1Size, h2Size, h3Size };
  });

  expect(sizes.h1Size).toBeGreaterThan(sizes.h2Size);
  expect(sizes.h2Size).toBeGreaterThan(sizes.h3Size);
});

test("chapter summary preview renders core markdown formatting primitives", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");
  await page.getByTestId("curriculum-tab-chapter").click();

  await page.getByTestId("curriculum-chapter-summary-input").fill(
    "# Title\n" +
      "## Section\n" +
      "### Sub-section\n\n" +
      "---\n\n" +
      "**Strong emphasis** and *Light emphasis* and ~~Mistake~~\n\n" +
      '> "Quote of the day"\n\n' +
      "- Bullet one\n" +
      "- Bullet two\n\n" +
      "1. First\n" +
      "2. Second\n\n" +
      "- [x] Task completed\n" +
      "- [ ] Task pending\n\n" +
      "Inline code: `print(\"Hello\")`\n\n" +
      "```javascript\n" +
      'const gemini = "Creative and helpful";\n' +
      "console.log(gemini);\n" +
      "```\n\n" +
      "$$E = mc^2$$\n\n" +
      "[Display Text](https://example.com)\n\n" +
      "![Alt Text](https://example.com/image.png)\n\n" +
      "Text[^1]\n\n" +
      "[^1]: The reference."
  );
  await page.getByTestId("curriculum-chapter-summary-preview-toggle").click();

  const preview = page.locator("[data-testid='curriculum-chapter-summary-preview']");

  await expect(preview.locator("hr")).toHaveCount(1);
  await expect(preview.locator("strong", { hasText: "Strong emphasis" })).toBeVisible();
  await expect(preview.locator("em", { hasText: "Light emphasis" })).toBeVisible();
  await expect(preview.locator("del", { hasText: "Mistake" })).toBeVisible();
  await expect(preview.locator("blockquote", { hasText: "Quote of the day" })).toBeVisible();
  await expect(preview.locator("ul").first()).toHaveCSS("list-style-type", "disc");
  await expect(preview.locator("ol").first()).toHaveCSS("list-style-type", "decimal");
  await expect(preview.locator("ul li input[type='checkbox']")).toHaveCount(2);
  await expect(preview.locator("code", { hasText: 'print("Hello")' })).toBeVisible();
  await expect(preview.locator("pre code.language-javascript")).toContainText("console.log(gemini);");
  await expect(preview.locator(".katex-display")).toHaveCount(1);
  await expect(preview.locator("a[href='https://example.com']")).toHaveText("Display Text");
  await expect(preview.locator("img[alt='Alt Text']")).toHaveCount(1);
  await expect(preview.locator("sup a[href*='fn-1']")).toHaveCount(1);
  await expect(preview.locator("section[data-footnotes]")).toContainText("The reference.");
});

test("chapter summary preview renders legacy latex fragments and center html", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");
  await page.getByTestId("curriculum-tab-chapter").click();

  await page.getByTestId("curriculum-chapter-summary-input").fill(
    "(1 \\mathrm{fm} = 10^{-15} \\mathrm{m}) [ \\text{Atom} = 1 \\mathrm{\\AA} = 10^{-10} \\mathrm{m} ]\n\n<center>Fig 1.5 The modern view of an Atom</center>"
  );
  await page.getByTestId("curriculum-chapter-summary-preview-toggle").click();

  const preview = page.locator("[data-testid='curriculum-chapter-summary-preview']");
  await expect(preview.locator(".katex")).toHaveCount(2);
  await expect(preview.locator("center")).toContainText("Fig 1.5 The modern view of an Atom");
  await expect(preview).not.toContainText("<center>");
});

test("chapter add and edit summary previews can be toggled", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");
  await page.getByTestId("curriculum-tab-chapter").click();

  await expect(page.getByTestId("curriculum-chapter-summary-preview")).toHaveCount(0);
  await page.getByTestId("curriculum-chapter-summary-input").fill("Preview toggle check.");
  await page.getByTestId("curriculum-chapter-summary-preview-toggle").click();
  await expect(page.getByTestId("curriculum-chapter-summary-preview")).toBeVisible();
  await page.getByTestId("curriculum-chapter-summary-preview-toggle").click();
  await expect(page.getByTestId("curriculum-chapter-summary-preview")).toHaveCount(0);

  await page.getByTestId("curriculum-chapter-mode-edit").click();
  await expect(page.getByTestId("curriculum-summary-editor-preview")).toHaveCount(0);
  await page.getByTestId("curriculum-summary-editor-preview-toggle").click();
  await expect(page.getByTestId("curriculum-summary-editor-preview")).toBeVisible();
  await page.getByTestId("curriculum-summary-editor-preview-toggle").click();
  await expect(page.getByTestId("curriculum-summary-editor-preview")).toHaveCount(0);
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
    .fill("![PreviewDiagramMd](https://example.com/momentum.png \"width=220 height=140\")\n\n$$x = 8 \\quad \\text{or} \\quad x = 3$$");
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

  const image = page.locator("[data-testid='chapter-summary-markdown'] img[alt='PreviewDiagramMd']");
  await expect(image).toHaveCount(1);
  await expect(image).toHaveCSS("width", "220px");
  await expect(image).toHaveCSS("height", "140px");
  await expect(page.locator("[data-testid='chapter-summary-markdown'] .katex-display")).toHaveCount(1);
  await expect(page.locator("[data-testid='chapter-summary-markdown']")).not.toContainText("$$x = 8");
});

test("admin summary editor saves markdown for selected chapter", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");

  const suffix = Date.now().toString();
  const boardName = `Editor Board ${suffix}`;
  const className = `9th ${suffix}`;
  const subjectName = `Editor Chemistry ${suffix}`;
  const chapterTitle = `Atomic Structure ${suffix}`;

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
  await page.getByTestId("curriculum-chapter-summary-input").fill("Draft summary from create form.");
  await page.getByTestId("curriculum-chapter-submit").click();

  await page.getByTestId("curriculum-chapter-mode-edit").click();
  const chapterLabel = `${boardName} / ${className} / ${subjectName} / Chapter 1: ${chapterTitle}`;
  await page.getByTestId("curriculum-summary-editor-chapter-select").selectOption({ label: chapterLabel });

  await page.getByTestId("curriculum-summary-editor-preview-toggle").click();
  await expect(page.getByTestId("curriculum-summary-editor-preview")).toContainText("Draft summary from create form.");
  await setSummaryCodeMirrorContent(
    page,
    "Updated summary from editor.\n\n![EditorFigure](https://example.com/editor.png \"width=200\")"
  );
  await page.getByTestId("curriculum-summary-editor-save-button").click();
  await expect(page.getByText("Chapter summary updated")).toBeVisible();

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

  await page.goto(
    `/${toSlug(boardName)}/${toSlug(className)}/${toSlug(subjectName)}/${toSlug(chapterTitle)}?tab=summary`
  );

  const summaryBlock = page.locator("[data-testid='chapter-summary-markdown']");
  await expect(summaryBlock).toContainText("Updated summary from editor.");
  const editorFigure = summaryBlock.locator("img[alt='EditorFigure']");
  await expect(editorFigure).toHaveCount(1);
  await expect(editorFigure).toHaveCSS("width", "200px");
});

test("admin summary editor imports markdown file for review before save", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");

  const suffix = Date.now().toString();
  const boardName = `Import Board ${suffix}`;
  const className = `10th ${suffix}`;
  const subjectName = `Import Biology ${suffix}`;
  const chapterTitle = `Cell Theory ${suffix}`;
  const originalSummary = "Original summary from create form.";
  const unsavedSummary = "Unsaved editor draft that should survive cancel.";
  const importedSummary = "# Imported summary\n\nImported markdown body.";

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
  await page.getByTestId("curriculum-chapter-summary-input").fill(originalSummary);
  await page.getByTestId("curriculum-chapter-submit").click();

  await page.getByTestId("curriculum-chapter-mode-edit").click();
  const chapterLabel = `${boardName} / ${className} / ${subjectName} / Chapter 1: ${chapterTitle}`;
  await page.getByTestId("curriculum-summary-editor-chapter-select").selectOption({ label: chapterLabel });

  await expect(page.getByTestId("curriculum-summary-editor-paste-option")).toBeVisible();
  await expect(page.getByTestId("curriculum-summary-editor-markdown-option")).toBeVisible();

  await setSummaryCodeMirrorContent(page, unsavedSummary);
  await page.getByTestId("curriculum-summary-editor-preview-toggle").click();
  await expect(page.getByTestId("curriculum-summary-editor-preview")).toContainText(unsavedSummary);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("replace");
    await dialog.dismiss();
  });
  await page.getByTestId("curriculum-summary-editor-markdown-input").setInputFiles({
    name: "chapter-summary.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(importedSummary)
  });

  await expect(page.getByTestId("curriculum-summary-editor-preview")).toContainText(unsavedSummary);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("replace");
    await dialog.accept();
  });
  await page.getByTestId("curriculum-summary-editor-markdown-input").setInputFiles({
    name: "chapter-summary.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(importedSummary)
  });

  await expect(page.getByTestId("curriculum-summary-editor-preview")).toContainText("Imported summary");
  await expect(page.getByTestId("curriculum-summary-editor-preview")).toContainText("Imported markdown body.");

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

  const summaryBeforeSaveResponse = await page.request.get(
    `http://localhost:3001/api/admin/content/chapters/${chapterId}/summary`
  );
  expect(summaryBeforeSaveResponse.status()).toBe(200);
  const summaryBeforeSavePayload = (await summaryBeforeSaveResponse.json()) as {
    chapter: { summary: string };
  };
  expect(summaryBeforeSavePayload.chapter.summary).toBe(originalSummary);

  await page.getByTestId("curriculum-summary-editor-save-button").click();
  await expect(page.getByText("Chapter summary updated")).toBeVisible();

  const summaryAfterSaveResponse = await page.request.get(
    `http://localhost:3001/api/admin/content/chapters/${chapterId}/summary`
  );
  expect(summaryAfterSaveResponse.status()).toBe(200);
  const summaryAfterSavePayload = (await summaryAfterSaveResponse.json()) as {
    chapter: { summary: string };
  };
  expect(summaryAfterSavePayload.chapter.summary).toBe(importedSummary);
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
