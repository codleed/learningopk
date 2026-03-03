import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const registerStudent = async (page: Page, name: string) => {
  const timestamp = Date.now();
  const password = "StrongPass123";

  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Degree").fill("Matriculation");
  await page.getByLabel("Board").selectOption("fbise");
  await page.getByLabel("Class").selectOption("9th");
  await page.getByLabel("Email").fill(`subject_graph_perf_${timestamp}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
};

test("student subject graph interaction performance budget", async ({ page }, testInfo) => {
  await registerStudent(page, "Subject Graph Perf Student");

  const subjectRouteStart = Date.now();
  await page.goto("/fbise/9th/physics");
  await expect(page.getByRole("heading", { level: 1, name: "Physics" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open chapter" }).first()).toBeVisible();
  const subjectRouteLoadMs = Date.now() - subjectRouteStart;

  const graphLoadStart = Date.now();
  await page.getByTestId("subject-view-tab-graph").click();
  await expect(page.getByTestId("subject-chapter-graph-panel")).toBeVisible();
  await expect(page.getByTestId("subject-graph-node-list")).toContainText("Physical Quantities and Measurement");
  const graphLoadMs = Date.now() - graphLoadStart;

  const searchInput = page.getByTestId("subject-graph-search");
  const graphNodes = page.getByTestId("subject-graph-node-list");
  const searchSamplesMs: number[] = [];
  const queries = ["kinematics", "physical", "kinematics", "physical", "kinematics"];

  for (const query of queries) {
    const start = Date.now();
    await searchInput.fill(query);
    if (query === "kinematics") {
      await expect(graphNodes).toContainText("Kinematics");
      await expect(graphNodes).not.toContainText("Physical Quantities and Measurement");
    } else {
      await expect(graphNodes).toContainText("Physical Quantities and Measurement");
      await expect(graphNodes).not.toContainText("Kinematics");
    }
    searchSamplesMs.push(Date.now() - start);
  }

  const searchP95Ms = Number(percentile(searchSamplesMs, 0.95).toFixed(2));
  const searchMeanMs = Number((searchSamplesMs.reduce((total, value) => total + value, 0) / searchSamplesMs.length).toFixed(2));
  const searchMaxMs = Number(Math.max(...searchSamplesMs).toFixed(2));

  expect(subjectRouteLoadMs).toBeLessThan(8000);
  expect(graphLoadMs).toBeLessThan(5000);
  expect(searchP95Ms).toBeLessThan(1200);

  const metrics = {
    capturedAt: new Date().toISOString(),
    subjectRouteLoadMs,
    graphLoadMs,
    search: {
      sampleCount: searchSamplesMs.length,
      p95Ms: searchP95Ms,
      meanMs: searchMeanMs,
      maxMs: searchMaxMs
    }
  };

  const reportDir = path.resolve(process.cwd(), "../docs/perf");
  const reportPath = path.resolve(reportDir, "student-subject-graph-performance.json");
  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");

  await testInfo.attach("student-subject-graph-performance", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json"
  });
});
