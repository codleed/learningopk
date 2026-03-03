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
  await page.getByLabel("Email").fill(`subject_page_baseline_${timestamp}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test("subject page list view baseline performance", async ({ page }, testInfo) => {
  await registerStudent(page, "Subject Page Baseline Student");

  const subjectRouteStart = Date.now();
  await page.goto("/fbise/9th/physics");
  await expect(page.getByRole("heading", { level: 1, name: "Physics" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open chapter" }).first()).toBeVisible();
  const subjectRouteLoadMs = Date.now() - subjectRouteStart;

  expect(subjectRouteLoadMs).toBeLessThan(8000);

  const metrics = {
    capturedAt: new Date().toISOString(),
    subjectRouteLoadMs
  };

  const reportDir = path.resolve(process.cwd(), "../docs/perf");
  const reportPath = path.resolve(reportDir, "student-subject-graph-baseline.json");
  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");

  await testInfo.attach("student-subject-graph-baseline", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json"
  });
});
