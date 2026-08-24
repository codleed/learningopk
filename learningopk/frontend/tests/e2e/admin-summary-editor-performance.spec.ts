import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([
    page.waitForURL(/\/dashboard$/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
};

const buildLongMarkdown = (targetLength: number): string => {
  const line =
    "Momentum depends on mass and velocity with practical examples from chapter drills. ";
  let content = "## Summary Performance Baseline\n\n";
  while (content.length < targetLength) {
    content += `${line}${Math.random().toString(36).slice(2, 8)}\n`;
  }
  return content;
};

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
};

test("admin summary editor baseline performance", async ({ page }, testInfo) => {
  await loginAsSeededAdmin(page);

  const routeLoadStart = Date.now();
  await page.goto("/admin/content");
  await page.getByTestId("curriculum-tab-chapter").click();
  await expect(page.getByTestId("curriculum-summary-editor-chapter-select")).toBeVisible();
  const routeLoadMs = Date.now() - routeLoadStart;

  const select = page.getByTestId("curriculum-summary-editor-chapter-select");
  const firstChapterValue = await select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    const firstOption = Array.from(selectElement.options).find(
      (option) => option.value.trim().length > 0
    );
    return firstOption?.value ?? "";
  });
  expect(firstChapterValue.length).toBeGreaterThan(0);

  const summaryLoadStart = Date.now();
  await select.selectOption(firstChapterValue);
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const cmHost = document.querySelector("[data-testid='curriculum-summary-editor-cm6']") as
          (HTMLDivElement & { __cmView?: { state: { doc: { toString: () => string } } } }) | null;
        if (cmHost?.__cmView) {
          return cmHost.__cmView.state.doc.toString().trim().length;
        }

        const textarea = document.querySelector(
          "[data-testid='curriculum-summary-editor-input']"
        ) as HTMLTextAreaElement | null;
        return textarea?.value.trim().length ?? 0;
      });
    })
    .toBeGreaterThan(0);
  const summaryLoadMs = Date.now() - summaryLoadStart;

  const longMarkdown = buildLongMarkdown(15_000);
  const typingMetrics = await page.evaluate(async (seedMarkdown) => {
    const cmHost = document.querySelector("[data-testid='curriculum-summary-editor-cm6']") as
      | (HTMLDivElement & {
          __cmView?: {
            state: {
              doc: { length: number; toString: () => string };
            };
            dispatch: (payload: unknown) => void;
          };
        })
      | null;
    const input = document.querySelector(
      "[data-testid='curriculum-summary-editor-input']"
    ) as HTMLTextAreaElement | null;

    const waitFrame = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

    if (cmHost?.__cmView) {
      const view = cmHost.__cmView;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: seedMarkdown,
        },
      });
      await waitFrame();
      await waitFrame();

      const samples: number[] = [];
      for (let index = 0; index < 60; index += 1) {
        const token = String.fromCharCode(97 + (index % 26));
        const start = performance.now();
        view.dispatch({
          changes: {
            from: view.state.doc.length,
            to: view.state.doc.length,
            insert: token,
          },
        });
        await waitFrame();
        await waitFrame();
        samples.push(performance.now() - start);
      }

      return {
        editorType: "codemirror",
        samples,
        finalLength: view.state.doc.length,
      };
    }

    if (!input) {
      return null;
    }

    input.value = seedMarkdown;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await waitFrame();
    await waitFrame();

    const samples: number[] = [];
    for (let index = 0; index < 60; index += 1) {
      const token = String.fromCharCode(97 + (index % 26));
      const start = performance.now();
      input.value = `${input.value}${token}`;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await waitFrame();
      await waitFrame();
      samples.push(performance.now() - start);
    }

    return {
      editorType: "textarea",
      samples,
      finalLength: input.value.length,
    };
  }, longMarkdown);

  if (!typingMetrics) {
    throw new Error("Unable to capture typing metrics from summary editor.");
  }

  const typingP95Ms = Number(percentile(typingMetrics.samples, 0.95).toFixed(2));
  const typingMeanMs = Number(
    (
      typingMetrics.samples.reduce((total, value) => total + value, 0) /
      typingMetrics.samples.length
    ).toFixed(2)
  );
  const typingMaxMs = Number(Math.max(...typingMetrics.samples).toFixed(2));

  expect(typingMetrics.finalLength).toBeGreaterThan(15_000);
  expect(typingP95Ms).toBeLessThan(250);

  const metrics = {
    capturedAt: new Date().toISOString(),
    editorType: typingMetrics.editorType,
    routeLoadMs,
    summaryLoadMs,
    typing: {
      sampleCount: typingMetrics.samples.length,
      p95Ms: typingP95Ms,
      meanMs: typingMeanMs,
      maxMs: typingMaxMs,
    },
  };

  const reportDir = path.resolve(process.cwd(), "../docs/perf");
  const reportPath = path.resolve(reportDir, "admin-summary-editor-baseline.json");
  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");

  await testInfo.attach("summary-editor-baseline", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
});
