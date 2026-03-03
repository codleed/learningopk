import { expect, test, type Page } from "@playwright/test";

const registerStudent = async (page: Page, name: string) => {
  const timestamp = Date.now();
  const password = "StrongPass123";

  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Degree").fill("Matriculation");
  await page.getByLabel("Board").selectOption("fbise");
  await page.getByLabel("Class").selectOption("9th");
  await page.getByLabel("Email").fill(`subject_graph_${timestamp}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
};

test("student subject graph renders, filters by chapter title, and opens chapter from node action", async ({ page }) => {
  await registerStudent(page, "Subject Graph Student");

  await page.goto("/fbise/9th/physics");
  await expect(page.getByRole("heading", { level: 1, name: "Physics" })).toBeVisible();

  await page.getByTestId("subject-view-tab-graph").click();
  await expect(page.getByTestId("subject-chapter-graph-panel")).toBeVisible();

  const graphNodes = page.getByTestId("subject-graph-node-list");
  await expect(graphNodes).toContainText("Physical Quantities and Measurement");
  await expect(graphNodes).toContainText("Kinematics");
  await expect(graphNodes).not.toContainText("Fundamentals of Chemistry");

  await page.getByTestId("subject-graph-search").fill("kinematics");
  await expect(graphNodes).toContainText("Kinematics");
  await expect(graphNodes).not.toContainText("Physical Quantities and Measurement");

  await page.getByTestId("subject-graph-node-link-kinematics").click();
  await expect(page).toHaveURL(/\/fbise\/9th\/physics\/kinematics(\?.*)?$/);
});
